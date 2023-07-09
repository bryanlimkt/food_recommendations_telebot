import { ClientSession, DataSource, Like, Repository } from "typeorm"
import { AppDataSource } from "./data-source"
import { FoodRecommendation } from "./entity/food-recommendation"
import ngeohash from 'ngeohash'
import { Context, Telegraf } from "telegraf"
import { Update } from "telegraf/typings/core/types/typegram"
import axios from "axios"
import 'dotenv/config'

export async function initializeDataSource(): Promise<DataSource> {
    return new Promise((resolve, reject) => {
        AppDataSource.initialize().then(async () => {
            console.log('Data Source Initialized')
            resolve(AppDataSource)
        }).catch(error => {
            console.log(error)
            reject(error)
        })
    })
} 

export class App {
    datasource: DataSource
    foodRepo: Repository<FoodRecommendation>
    async initializeDataSource () {
        this.datasource = await initializeDataSource()
        this.foodRepo = this.datasource.getRepository(FoodRecommendation)
    }
    async getRecommendations(geohash: string) {
        geohash = geohash.slice(0,6)
        const neighbors = ngeohash.neighbors(geohash)
        neighbors.push(geohash)
        let allRecommendations = []
        for (let neighbor of neighbors){
            const recommendations = await this.foodRepo.find({where: {geohash: Like(`%${neighbor}%`)}})
            allRecommendations.push(...recommendations)
        }
        return allRecommendations
    }
    startTelebot() {
        const bot: Telegraf<Context<Update>> = new Telegraf(process.env.BOT_TOKEN as string);
        bot.start((ctx) => {
            ctx.reply(`Hello ${ctx.from.first_name}!\n\nTo use this Bot, send your location and you will receive a list of places to eat!`);
          });
          bot.help((ctx) => {
            ctx.reply('Send /start to receive a greeting');
          });
        //   bot.command('quit', (ctx) => {
        //     // Explicit usage
        //     ctx.telegram.leaveChat(ctx.message.chat.id);
        //   // Context shortcut
        //     ctx.leaveChat();
        //   });
    
          bot.on('location', async (ctx) => {
              console.log(`Location Request from ${ctx.from.first_name}`)
              const {latitude, longitude} = ctx.update.message.location
              console.log(`Location at Latitutde: ${latitude}, Longitude: ${longitude}`)
              const geohash = ngeohash.encode(latitude, longitude)
              const recommendations: FoodRecommendation[] = await this.getRecommendations(geohash)
              let output = parseRecommendationMessage(recommendations)
              if (!output){
                  ctx.reply('No Recommendations Found For your Requested Location!')
                } else {
                    if(output.length <= 4096) {
                        ctx.reply(output)
                    } else {
                        const messagesArray = splitMessage(output)
                        for (let message of messagesArray) {
                            ctx.reply(message)
                        }
                    }
                }
          })
          bot.on('text', async (ctx) => {
              let messageText = ctx.message.text
              if (/^\d{6}$/.test(messageText)) {
                messageText = `Singapore ${messageText}`
              }
            const locations = await getLatLongFromAddress(messageText)
            if (locations.length === 0) {
                ctx.reply('Please input a location such as "Tan Kah Kee MRT" or "Singapore 123456" or "31 Ocean Way"')
            } else {
                const {LATITUDE, LONGITUDE} = locations[0]
                const geohash = ngeohash.encode(LATITUDE, LONGITUDE)
                const recommendations: FoodRecommendation[] = await this.getRecommendations(geohash)
                let output = parseRecommendationMessage(recommendations)
                if (!output){
                    ctx.reply('No Recommendations Found For your Requested Location!')
                } else {
                    if(output.length <= 4096) {
                        ctx.reply(output)
                    } else {
                        const messagesArray = splitMessage(output)
                        for (let message of messagesArray) {
                            ctx.reply(message)
                        }
                    }
                }
                ctx.reply(locations[0].ADDRESS)
            }
            
        })
          bot.launch();
          process.once('SIGINT', () => bot.stop('SIGINT'));
            process.once('SIGTERM', () => bot.stop('SIGTERM'));
    }


}
async function main() {
    const app = new App()
    await app.initializeDataSource()
    app.startTelebot()
}
function getLatLongFromAddress(address: string): Promise<any[]> {
    const urlEncodedAddress = encodeURIComponent(address)
    return new Promise((resolve, reject)=> {
        axios.get(`https://developers.onemap.sg/commonapi/search?searchVal=${urlEncodedAddress}&returnGeom=Y&getAddrDetails=Y`).then((res) => {
            resolve(res?.data?.results)
        }).catch((err) => {
            reject(err)
        })
    })
}

function parseRecommendationMessage(recommendations: FoodRecommendation[]) {
    let output = ''
              for (let i=0; i<recommendations.length; i++) {
                  const recommendation = recommendations[i]
                  const entry = `${i+1}. ${recommendation.food}\nLink: ${recommendation.link}\nAddress: ${recommendation.formattedAddress}\n\n`
                  output += `${entry}`
              }
    return output
}

function splitMessage (messageString: string): string[] {
    const max_size = 4096
    var amount_sliced = messageString.length / max_size
    var start = 0
    var end = max_size
    var message
    var messagesArray = []
    for (let i = 0; i < amount_sliced; i++) {
        message = messageString.slice(start, end) 
        messagesArray.push(message)
        start = start + max_size
        end = end + max_size
    }
    return messagesArray

}
main()




