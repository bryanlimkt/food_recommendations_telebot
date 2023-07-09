import { Entity, Column, PrimaryColumn } from "typeorm"

@Entity('food_recommendations')
export class FoodRecommendation {

    @PrimaryColumn()
    id: number

    @Column()
    food: number

    @Column()
    image: string

    @Column()
    link: string

    @Column()
    address: string
    
    @Column({name: 'postal_code'})
    postalCode: string

    @Column({name: 'google_maps_link'})
    googleMapsLink: string

    @Column()
    latitude: string

    @Column()
    longitude: string

    @Column({name: 'formatted_address'})
    formattedAddress: string

    @Column()
    geohash: string

}
