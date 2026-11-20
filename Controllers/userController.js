import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import OTP from "../models/otp.js";
import nodemailer from "nodemailer";

dotenv.config();

const transpoter = nodemailer.createTransport({
  service : "gmail",
  auth:{
    user : process.env.Gmail,
    pass : process.env.AppPassword
  }
})

// Generate JWT Token
function generateToken(user) {
    return jwt.sign(
        {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            isBlocked: user.isBlocked,
            isEmailVerified: user.isEmailVerified,
            image: user.image,
        },
        process.env.I_computers_secret_Key,
        {
            expiresIn: "48h",
        }
    );
}

// CREATE USER
export async function createUser(req, res) {
    try {
        const { email, firstName, lastName, password } = req.body;

        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({
                message: "Please fill in all required fields",
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            firstName,
            lastName,
            password: passwordHash,
        });

        await newUser.save();

        res.status(201).json({
            message: "User created successfully",
        });

    } catch (error) {
        console.error("Registration Error:", error);

        res.status(500).json({
            message: "Error creating user",
        });
    }
}

// LOGIN USER
export async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        const foundUser = await User.findOne({ email });

        if (!foundUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            foundUser.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid password",
            });
        }

        const token = generateToken(foundUser);

        res.status(200).json({
            token,
            isAdmin: foundUser.isAdmin,
        });

    } catch (error) {
        console.error("Login Error:", error);

        res.status(500).json({
            message: "Error logging in",
        });
    }
}

// CHECK ADMIN
export function isAdmin(req) {
    if (!req.User) {
        return false;
    }

    return req.User.isAdmin;
}

// GET USER DATA
export async function getUserDate(req, res) {
    if (!req.User) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    res.status(200).json(req.User);
}

// UPDATE USER DATA
export default async function updateUserDate(req, res) {
    if (!req.User) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { email: req.User.email },
            {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                image: req.body.image,
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const token = generateToken(updatedUser);

        res.status(200).json({
            token,
            isAdmin: updatedUser.isAdmin,
        });

    } catch (error) {
        console.error("Update User Error:", error);

        res.status(500).json({
            message: "Error updating user data",
        });
    }
}

// CHANGE PASSWORD
export async function changePassword(req, res) {
    if (!req.User) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters",
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findOneAndUpdate(
            { email: req.User.email },
            { password: hashedPassword }
        );

        res.status(200).json({
            message: "Password changed successfully",
        });

    } catch (error) {
        console.error("Change Password Error:", error);

        res.status(500).json({
            message: "Error changing password",
        });
    }
}

// GOOGLE LOGIN
export async function googleLogin(req, res) {
    try {
        const accessToken = req.body.token;

        if (!accessToken) {
            return res.status(400).json({
                message: "Google access token is missing",
            });
        }

        // Get Google user information
        const response = await axios.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        const googleUser = response.data;

        if (!googleUser.email || !googleUser.email_verified) {
            return res.status(401).json({
                message: "Google email is not verified",
            });
        }

        // Check whether the user already exists
        let existingUser = await User.findOne({
            email: googleUser.email,
        });

        // Create a new account if necessary
        if (!existingUser) {
            existingUser = new User({
                email: googleUser.email,
                firstName: googleUser.given_name || "",
                lastName: googleUser.family_name || "",
                password: "google-login",
                isEmailVerified: true,
                image: googleUser.picture || "",
            });

            await existingUser.save();
        }

        // Generate JWT token
        const token = generateToken(existingUser);

        res.status(200).json({
            token,
            isAdmin: existingUser.isAdmin,
        });

    } catch (error) {
        console.error(
            "Google Login Error:",
            error.response?.data || error.message
        );

        res.status(500).json({
            message: "Google authentication failed",
        });
    }
}


export async function sendOTP(req,res){
  const email = req.body.email
    try{

      const user = await User.findOne({email : email})
      if(user == null){
        res.status(404).json({
          message : "User Not Found"
        })
        return
      }
      //Delete OTPs on user's name on Database
      await OTP.deleteOne({email : email})


      //generate OTP and Save it on the Database
      const otpCode = Math.floor(100000 + Math.random() * 900000 ).toString()

      const newOTP = new OTP({
        email : email,
        otp : otpCode
      })
      await newOTP.save()

      // Send OTP to the Uers's Email
      const message = {
        from : process.env.Gmail,
        to : email,
        subject : "password Reset",
        text : "Your password reset Code is " + otpCode
      }
      
      const info = await transpoter.sendMail(message)
      console.log("OTP email sent: " + info.response)
      res.json({
        message : "OTP Send Sucessfully"
      })

    }catch(error){
      console.error("Send OTP Error:", error)
      res.status(500).json({
        message : "Error sending OTP"
      })
    }
}

 export async function verifyOTPAndResetPassword(req,res){
        const email = req.body.email
        const otp = req.body.otp
        const newPassword = req.body.newPassword
  try{
    const otpRecord = await OTP.findOne({email : email})
    if(otpRecord == null){
      res.status(400).json({
        message : "Invalid Otp"
      })
      return
    }
    if(otpRecord.otp !== otp){
      res.status(400).json({
        message : "Invalid Otp"
      })
      return
    }

    const otpAge = (Date.now() - otpRecord.createdTime.getTime()) / (1000 * 60) // Age in Minutes
    if(otpAge > 10){
      await OTP.deleteOne({email : email})
      res.status(400).json({
        message : "Otp Expired"
      })
      return
    }

    const hashedPassword = bcrypt.hashSync(newPassword , 10)

    await User.findOneAndUpdate(
      {email : email},
      {password : hashedPassword}
    )

    await OTP.deleteOne ({email : email})

    res.json({
      message : "Password Reset succesfully"
    })

  }catch(error){
    console.error("Reset Password Error:", error)
    res.status(500).json({
      message : "Error Resetting Password"
    })
  }
      }