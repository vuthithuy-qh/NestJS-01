import { ApiProperty } from '@nestjs/swagger';
import { CatResponseDto } from './cat-response.dto';

export class PaginatedCatResponseDto {
    @ApiProperty({ type: [CatResponseDto] })
    data: CatResponseDto[];

    @ApiProperty({ example: 100 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 10 })
    limit: number;

    @ApiProperty({ example: 10 })
    totalPages: number;
}