import { comparePassword, hashPassword } from "../helpers/authHelper.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import JWT from "jsonwebtoken";

export const registerController = async (req, res) => {
  console.log('aaayi hai yha pe', req.body)
  try {
    const { name, email, password, phone, address, sport } = req.body;
    // validations
    if (!name || !/^[A-Za-z -]+$/.test(name)) {
      return res.send({ message: "name is required" });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.send({ message: "email is required and must be a valid email address" });
    }
    if (!password || password.length < 8) {
      return res.send({ message: "password is required and length should be more than 8 characters" });
    }
    if (!phone || !phone.length == 10 || !/^\d{10}$/.test(phone)) {
      return res.send({ message: "phone is required and length should be 10 digits/number" });
    }
    if (!address || address.length >= 250) {
      return res.send({ message: "address is required and length should not more than 250 characters" });
    }
    if (!sport || sport.length >= 250) {
      return res.send({ message: "sport is required and length should not more than 250 characters" });
    }

    // existing user
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(200).send({
        success: false,
        message: "Already register please login",
      });
    }

    // register user
    const hashedPassword = await hashPassword(password);
    // save new user
    const user = await new userModel({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      sport
    }).save();
    res.status(201).send({
      success: true,
      message: "User register successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in registration",
      error,
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(404).send({
        success: false,
        message: "Invalid email and password.",
      });
    }
    // check user
    const user = await userModel.findOne({ email });
    console.log("user email:::", user);
    console.log("user email: type::", typeof user);
    console.log("user:::password:::", user.password);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Email is not registered.",
      });
    }
    const match = await comparePassword(password, user.password);
    console.log("match password", match);
    if (!match) {
      return res.status(404).send({
        success: false,
        message: "Password is incorrect.",
      });
    }

    // creating token
    const token = await JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).send({
      success: true,
      message: "LOGIN SUCCESSFULLY",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        sport: user.sport,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.log("ERROR IN LOGIN", error);
    res.status(500).send({
      success: false,
      message: "Error in LOGIN",
      error,
    });
  }
};

//forgotPasswordController

export const forgotPasswordController = async (req, res) => {
  console.log('mai u');
  try {
    const { email, sport, newPassword } = req.body;
    if (!email) {
      res.status(400).send({ message: "Emai is required" });
    }
    if (!sport) {
      res.status(400).send({ message: "answer is required" });
    }
    if (!newPassword) {
      res.status(400).send({ message: "New Password is required" });
    }
    //check
    const user = await userModel.findOne({ email, sport });
    //validation
    console.log('user ::', user);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Wrong Email Or Answer",
      });
    }
    const hashed = await hashPassword(newPassword);
    await userModel.findByIdAndUpdate(user._id, { password: hashed });
    res.status(200).send({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

// test controller
export const testConroller = (req, res) => {
  res.send("protected routers now user is authorized");
};


//update prfole
export const updateProfileController = async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const user = await userModel.findById(req.user._id);
    //password
    if (password && password.length < 6) {
      return res.json({ error: "Passsword is required and 6 character long" });
    }
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      {
        name: name || user.name,
        password: hashedPassword || user.password,
        phone: phone || user.phone,
        address: address || user.address,
      },
      { new: true }
    );
    res.status(200).send({
      success: true,
      message: "Profile Updated Successfully",
      updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error while update profile",
      error,
    });
  }
};

//orders
export const getOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name");
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Getting Orders",
      error,
    });
  }
};
//orders
export const getAllOrdersController = async (req, res) => {
  console.log('aay ahai tk')
  try {
    const orders = await orderModel
      .find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
    // .sort({ createdAt: "-1" });
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error WHile Geting Orders",
      error,
    });
  }
};

//order status
export const orderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const orders = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Updateing Order",
      error,
    });
  }
};