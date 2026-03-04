import {Injectable} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {ExtractJwt, Strategy} from "passport-jwt";
import {ConfigService} from "@nestjs/config";
import {JwtPayload} from "./jwt.strategy";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh'){

    constructor(private configService: ConfigService) {

        // @ts-ignore
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
        });
    }

    async validate(payload: JwtPayload){
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role
        }
        }
    }