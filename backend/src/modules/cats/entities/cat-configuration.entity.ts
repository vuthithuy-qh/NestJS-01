import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {CatSpec} from "./cat-spec.entity";
import {VariantOption} from "./variant-option.entity";


@Entity('cat_configurations')
export class CatConfiguration {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    catSpecId: number;

    @ManyToOne(() => CatSpec, catSpec => catSpec.configurations)
    @JoinColumn({ name: 'catSpecId' })
    catSpec: CatSpec;

    @Column()
    variantOptionId: number;

    @ManyToOne(() => VariantOption)
    @JoinColumn({ name: 'variantOptionId' })
    variantOption: VariantOption;
}