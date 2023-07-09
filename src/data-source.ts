import "reflect-metadata"
import { DataSource } from "typeorm"
import { FoodRecommendation } from "./entity/food-recommendation"

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "food_recommendations.db",
    synchronize: false,
    logging: false,
    entities: [FoodRecommendation],
    migrations: [],
    subscribers: [],
})
