import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCatSpecDto } from './create-cat-spec.dto';

export class UpdateCatSpecDto extends PartialType(
    OmitType(CreateCatSpecDto, ['catId'] as const)
) {}