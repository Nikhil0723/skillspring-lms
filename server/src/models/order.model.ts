import mongoose, { Document, Model, Types } from "mongoose";
import { IOrder } from "../interfaces/orderInterface";

const orderSchema = new mongoose.Schema<IOrder>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    paymentInfo: Object,
    fulfilledAt: Date,
  },
  {
    timestamps: true,
  },
);

orderSchema.index(
  { "paymentInfo.id": 1 },
  { unique: true, partialFilterExpression: { "paymentInfo.id": { $type: "string" } } },
);

const OrderModel: Model<IOrder> = mongoose.model("Order", orderSchema);
export default OrderModel;
