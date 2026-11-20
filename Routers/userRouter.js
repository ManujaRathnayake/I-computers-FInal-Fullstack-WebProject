import express from "express";
import updateUserDate, { changePassword, createUser, getUserDate, googleLogin, loginUser, sendOTP, verifyOTPAndResetPassword } from "../Controllers/userController.js";


const userRouter = express.Router();

userRouter.post("/" , createUser)
userRouter.post("/login" , loginUser)
userRouter.get("/me" , getUserDate)
userRouter.put("/" , updateUserDate)
userRouter.put("/password" , changePassword)
userRouter.post("/google-login" , googleLogin)
userRouter.post("/send-otp" , sendOTP)
userRouter.post("/verify-otp" , verifyOTPAndResetPassword)


export default userRouter;