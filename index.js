const express = require("express");
const app = express();
const cors = require("cors");
const loger = require("morgan");
const Product = require("./Models/product");
require("./db/config");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const salt=10
const nodemailer = require("nodemailer");
const secretKey = "sahaid";
var jwt = require("jsonwebtoken");
const register = require("./Models/Register");
const { default: mongoose } = require("mongoose");
app.use(express.json());
app.use(loger("dev"));
app.use(cors());

// Signup Api
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const isExist = await register.findOne({email: email });
    if (isExist) {
      return res.send({ message: "User Already Exists", code: 300 });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new register({
      name,
      email,
      password: hashedPassword,
    });

    // Save user to database
    const result = await newUser.save();
    res.send({ message: "Registration Successful", code: 200 });
  } catch (error) {
    console.error(error);
    res.send({ message: "Internal Server Error", code: 500 });
  }
});
// Login Api


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await register.findOne({ email });
    if (!user) {
      return res.send({ statusCode: 404, message: "User Not Found" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send({ statusCode: 400, message: "Password does not match" });
    }

    // Create a token
    const token = jwt.sign({ id: user._id }, secretKey, { expiresIn: "1h" });

    // Optionally, you can save the token in the user document
    user.token = token;
    await user.save();

    res.send({
      statusCode: 200,
      message: "Login Successfully",
      token,
      user,
    });
  } catch (error) {
    console.error(error);
    res.send({ statusCode: 500, message: "Internal Server Error" });
  }
});



app.post("/profile", verifyToken, (req, res) => {
  res.send("profile");
});
// Token Verify

async function verifyToken(req, res, next) {
  const token = req.headers["authorization"];

  //   console.log("request",req);
  const { email } = req.body;

  console.log("tokeno", token);
  if (token) {
    console.log("token1", token);
    const validToken = token.split(" ")[1];
    console.log("token3", validToken);
    // console.log("token",validToken);
    jwt.verify(validToken, secretKey, async (err, result) => {
      console.log("res", result);
      if (err) {
        res.send({ result: "please provide valid token" });
        console.log("err", err);
      } else {
        // res.send({result:result})
        const userVerify = await register.findOne({ email: email });
        console.log("user", userVerify);
        if (userVerify._id.toString() === result.data) {
          // console.log("1",userVerify._id.toString());
          next();
        } else {
          res.send({ result: "User Id Not Match" });
          console.log("match", userVerify._id);
        }
      }
    });
  } else {
    res.send({ result: "add token with Headers" });
  }
}



// forgotPassword........................
// Function to generate a 4-digit OTP
// otp Send
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
async function sendOtpEmail(recipientEmail, otp, firstName) {

  // Create a transporter object using SMTP transport
  let transporter = nodemailer.createTransport({
    service: "gmail", // or any other email service provider
    auth: {
      user: "snasim1786@gmail.com", // replace with your email
      pass: "pmujgadapmriwrll", // replace with your email password
    },
  });

  // Email options
  let mailOptions = {
    from: transporter.options.auth.user,
    to: recipientEmail, // Use recipientEmail here
    subject: "Your OTP Code", // Subject line
    html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Your OTP Code</h2>
          <p style="font-size: 18px; color: #555;">Hi ${firstName} !</p>
          <p style="font-size: 16px; color: #333;">Your OTP code is <strong style="font-size: 24px; color: #007BFF;">${otp}</strong>.</p>
          <p style="color: #777;">Please use this code to verify your identity.</p>
          <p style="font-size: 12px; color: #999;">If you did not request this code, please ignore this email.</p>
          <footer style="margin-top: 20px; font-size: 12px; color: #aaa;">
            &copy; ${new Date().getFullYear()} Your Company Name
          </footer>
        </div>
      `,
  };

  // Send email
  try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send OTP email");
  }
}


app.post ("/forgotpassword" ,async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email input
  
    const isExist = await register.findOne({ email: email });

    if (!isExist) {
      return res.send({ message: "User Not Found", statusCode: 404 });
    }
  
  

    // Generate OTP and send email
    const otp = generateOtp();
    await sendOtpEmail(email, otp, isExist.name,);
    isExist.otp = otp;
    isExist.otpGeneratedAt = Date.now();
    await isExist.save();
    // Respond to the client
    res.send({ message: "OTP sent successfully", email:isExist.email ,statusCode:200}); // You might want to store OTP in the database or cache for validation later
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal Server Error", statusCode: 500 });
  }
});

app.post("/resetPassword", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    

    // Find the user
    const userDoc = await register.findOne({ email: email });
    if (!userDoc) {
      return res
        .send({ message: "User Not Found", errorCode: 404 });
    }

    // Check if OTP is valid
    if (userDoc.otp !== otp) {
      return res.send({ message: "Invalid OTP", errorCode: 301 });
    }

    // Check if OTP has expired (5 minutes = 300000 milliseconds)
    const otpGeneratedAt = userDoc.otpGeneratedAt;
    const otpExpiryDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTime = Date.now();

    if (currentTime - otpGeneratedAt > otpExpiryDuration) {
      return res
        .send({ message: "OTP has expired", errorCode: 400 });
    }
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password (ensure you hash the password)
    userDoc.password = hashedPassword; // Make sure to hash the password before saving
    userDoc.otp = null; // Clear OTP
    userDoc.otpGeneratedAt = null; // Clear OTP expiry time
    await userDoc.save();

    // Respond to the client
    res.send({ message: "Password reset successfully",errorCode:200 });
  } catch (error) {
    console.error(error);
    res.send({ message: "Internal Server Error", errorCode: 500 });
  }
});

// Insert Product
// app.post("/add-product", async (req, res) => {
//   const {email, name, brand, price, descriptions } = req.body;
//   const isExist = await register.findOne({ email: email });
//   if (isExist) {
//     const data = {
//       userId: isExist._id,
//       name: name,
//       brand: brand,
//       price: price,
//       descriptions: descriptions,

//     }
//     let addProduct = new Product(data)
//     let result = await addProduct.save()
//     if (result) {
//       return res.send({result:result, message: "Product Upload", errorCode: 200 })
//     } else {
//       return res.send({ message: " Error in Product Upload", errorCode: 300 })
//     }
//   }
//   else {
//     return res.send({ message: "Email Not Exist", errorCode: 404 })
//   }
// })
app.post('/add-product', async (req, res) => {
  const {email, name, price, brand, descriptions } = req.body;
  // Create a new product using the Product model
const isexistUser= await register.findOne({email:email})

if (isexistUser) {
  try {
    const newProduct = new Product({
      userId:isexistUser._id,
      name,
      price,
      brand,
      descriptions,
    });
    await newProduct.save();
    res.send({result:newProduct,errorCode:200,message:"Product Add"});
  }
    catch (err) {
      res.send({errorCode:300,message:"Error"});
    }
}
  
else{
  res.send({errorCode:400,message:"Something Went Wrong"});
 
}
    
  
});








app.get("/adProductList", async (req, res) => {
  try {
    const userId = req.query.id;

    // Ensure userId is provided
    if (!userId) {
      return res.status(400).json({ result: "User ID is required", errorCode: 400 });
    }

    const products = await Product.find({ userId });

    if (products.length > 0) {
      return res.status(200).json({ result: products, errorCode: 200 });
    } else {
      return res.status(404).json({ result: "No products found", errorCode: 404 });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ result: "Internal Server Error", errorCode: 500 });
  }
});

// Example for handling delete requests:
app.delete("/deleteProduct/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ result: "Invalid product ID", errorCode: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ result: "Product not found", errorCode: 404 });
    }

    await Product.deleteOne({ _id: id });

    // Send back a response in JSON format
    return res.status(200).json({ result: "Product deleted successfully", errorCode: 200 });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ result: "Internal server error", errorCode: 500 });
  }
});

// Edit Api



app.get("/get-edit-product/:id", async (req, res) => {
  const { id } = req.params
  console.log(id);
  
  const getProfile = await Product.find({ _id: id })
  console.log(getProfile, "getProfile..........");
  if (getProfile) {
    return res.send({ result: getProfile, errorCode: 200 })
  } else {
    return res.send({ result: "SomeThing Went Wrong", errorCode: 404 })
  }

})

app.put("/edit-product/:id", async (req, res) => {
  const  {id}  = req.params
  console.log(id,"......");
  
  const EditProfile = await Product.updateOne({ _id: id }, { $set: req.body })
  if (EditProfile) {
    return res.send({ result: EditProfile, errorCode: 200 })
  } else {
    return res.send({ result: "Somthing Wrong" })
  }
})


app.listen(3000);
