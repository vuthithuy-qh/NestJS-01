import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CatInteraction } from '../entities/cat-interaction.entity';
import { InteractionType } from '../enum/interaction-type.enum';
import { Cat } from '../entities/cat.entity';

/**
 * ===================================================================
 *  CAT RANKING SERVICE — Adapted PageRank / Random Surfer Model
 * ===================================================================
 *
 *  Core formula per cat:
 *
 *    Score(cat) = (1 - d) / N  +  d × normalizedPopularity(cat)
 *
 *  where:
 *    d = 0.85  (damping factor — same as original PageRank)
 *    N = total number of active cats
 *    (1-d)/N = 0.15/N  → baseline "random surfer" score so every cat
 *              gets some visibility, preventing a "rich get richer" loop
 *
 *  normalizedPopularity(cat) =
 *    weightedScore(cat) / max(weightedScore across all cats)
 *
 *  weightedScore(cat) =
 *    Σ  weight(interaction.type) × decay(interaction.age)
 *
 *  Interaction weights:
 *    VIEW      = 1
 *    CART_ADD  = 3
 *    PURCHASE  = 5
 *
 *  Time decay (exponential, half-life = 7 days):
 *    decay(age_days) = 0.5 ^ (age_days / 7)
 *
 *  This ensures:
 *    • Recent interactions count more than old ones
 *    • Cart-adds and purchases signal stronger interest than views
 *    • Even cats with zero interactions appear (with baseline score)
 *    • The ordering is NOT static — it evolves with user behavior
 * ===================================================================
 */
@Injectable()
export class CatRankingService {
  // ── Tunable Constants ──
  private readonly DAMPING_FACTOR = 0.85;
  private readonly HALF_LIFE_DAYS = 7;
  private readonly LOOKBACK_DAYS = 30; // Only consider last 30 days

  private readonly INTERACTION_WEIGHTS: Record<InteractionType, number> = {
    [InteractionType.VIEW]: 1,
    [InteractionType.CART_ADD]: 3,
    [InteractionType.PURCHASE]: 5,
  };

  constructor(
    @InjectRepository(CatInteraction)
    private readonly interactionRepo: Repository<CatInteraction>,

    @InjectRepository(Cat)
    private readonly catRepo: Repository<Cat>,
  ) {}

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC: Track an interaction
  // ══════════════════════════════════════════════════════════════
  async trackInteraction(
    catId: number,
    type: InteractionType,
    userId?: number,
  ): Promise<void> {
    // De-duplicate rapid views: skip if same user viewed same cat within 5 min
    if (type === InteractionType.VIEW && userId) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recent = await this.interactionRepo.findOne({
        where: {
          catId,
          userId,
          type: InteractionType.VIEW,
          createdAt: MoreThan(fiveMinAgo),
        },
      });
      if (recent) return; // Already tracked recently
    }

    await this.interactionRepo.save(
      this.interactionRepo.create({
        catId,
        userId: userId ?? null,
        type,
      }),
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC: Get ranked cat IDs
  //  Returns cat IDs sorted by PageRank-style score (descending)
  // ══════════════════════════════════════════════════════════════
  async getRankedCatIds(limit: number = 50): Promise<number[]> {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - this.LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    // 1. Fetch all interactions within lookback window
    const interactions = await this.interactionRepo.find({
      where: { createdAt: MoreThan(cutoff) },
      select: ['catId', 'type', 'createdAt'],
    });

    // 2. Compute weighted score per cat with time decay
    const catScores = new Map<number, number>();

    for (const interaction of interactions) {
      const ageDays =
        (now.getTime() - new Date(interaction.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);

      const weight = this.INTERACTION_WEIGHTS[interaction.type] || 1;
      const decay = Math.pow(0.5, ageDays / this.HALF_LIFE_DAYS);
      const score = weight * decay;

      catScores.set(
        interaction.catId,
        (catScores.get(interaction.catId) || 0) + score,
      );
    }

    // 3. Get total active cats
    const totalCats = await this.catRepo.count();
    const N = Math.max(totalCats, 1);

    // 4. Normalize and apply damping factor
    const maxRawScore = Math.max(...catScores.values(), 1);
    const d = this.DAMPING_FACTOR;
    const baseline = (1 - d) / N; // Random surfer baseline

    // Build final scores (all cats, even those without interactions)
    const allCatIds = await this.catRepo
      .createQueryBuilder('cat')
      .select('cat.id')
      .getMany();

    const finalScores: Array<{ catId: number; score: number }> = [];

    for (const cat of allCatIds) {
      const rawScore = catScores.get(cat.id) || 0;
      const normalizedPopularity = rawScore / maxRawScore;
      const finalScore = baseline + d * normalizedPopularity;
      finalScores.push({ catId: cat.id, score: finalScore });
    }

    // 5. Sort by score descending, then add slight randomness for ties
    finalScores.sort((a, b) => {
      const diff = b.score - a.score;
      // For very close scores (< 1% diff), add slight randomness
      if (Math.abs(diff) < 0.01) {
        return Math.random() - 0.5;
      }
      return diff;
    });

    return finalScores.slice(0, limit).map((s) => s.catId);
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC: Get ranking stats (for debug / admin)
  // ══════════════════════════════════════════════════════════════
  async getRankingStats(): Promise<
    Array<{
      catId: number;
      score: number;
      views: number;
      cartAdds: number;
      purchases: number;
    }>
  > {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - this.LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const interactions = await this.interactionRepo.find({
      where: { createdAt: MoreThan(cutoff) },
      select: ['catId', 'type', 'createdAt'],
    });

    // Aggregate
    const catData = new Map<
      number,
      { score: number; views: number; cartAdds: number; purchases: number }
    >();

    for (const interaction of interactions) {
      if (!catData.has(interaction.catId)) {
        catData.set(interaction.catId, {
          score: 0,
          views: 0,
          cartAdds: 0,
          purchases: 0,
        });
      }
      const data = catData.get(interaction.catId)!;

      const ageDays =
        (now.getTime() - new Date(interaction.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      const weight = this.INTERACTION_WEIGHTS[interaction.type] || 1;
      const decay = Math.pow(0.5, ageDays / this.HALF_LIFE_DAYS);
      data.score += weight * decay;

      switch (interaction.type) {
        case InteractionType.VIEW:
          data.views++;
          break;
        case InteractionType.CART_ADD:
          data.cartAdds++;
          break;
        case InteractionType.PURCHASE:
          data.purchases++;
          break;
      }
    }

    // Apply damping factor
    const totalCats = await this.catRepo.count();
    const N = Math.max(totalCats, 1);
    const maxRawScore = Math.max(
      ...[...catData.values()].map((d) => d.score),
      1,
    );
    const d = this.DAMPING_FACTOR;
    const baseline = (1 - d) / N;

    const result = [...catData.entries()]
      .map(([catId, data]) => ({
        catId,
        score:
          Math.round((baseline + d * (data.score / maxRawScore)) * 10000) /
          10000,
        views: data.views,
        cartAdds: data.cartAdds,
        purchases: data.purchases,
      }))
      .sort((a, b) => b.score - a.score);

    return result;
  }
}
