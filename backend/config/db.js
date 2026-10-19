import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function ConnectDB() {
    try{
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("mongodb connected successfully")
    } catch(err) {
        console.error("db connection failed", err.message);
        process.exit(1);
    }
}
 export default  ConnectDB;
    
