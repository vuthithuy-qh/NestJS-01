import {CreateCatDto} from "./create-cat.dto";
import { PartialType } from '@nestjs/swagger';

export class UpdateCatDto extends PartialType(CreateCatDto) {

}