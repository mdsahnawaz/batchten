const mongoose = require("mongoose");

const objectId = mongoose.Schema.ObjectId;
const productSchema = new mongoose.Schema({
  userId: { type: objectId, ref: "register" },
  name: String,
  brand: String,
  price: Number,
  descriptions: String,
});
module.exports = mongoose.model("products", productSchema);
