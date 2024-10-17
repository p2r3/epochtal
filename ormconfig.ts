import {DataSource, DataSourceOptions} from "typeorm";

const ormConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT ?? '5432'),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    entities: ['entity/*.entity.ts'],
    migrations: ['migration/*.ts']
};

export default ormConfig;
export const dataSource = new DataSource(ormConfig);
