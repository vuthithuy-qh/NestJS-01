import {TypeOrmModuleAsyncOptions} from "@nestjs/typeorm";
import {ConfigService} from "@nestjs/config";


export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true, // chỉ dev
    }),
};