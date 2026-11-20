import express from "express";
import { createProduct, deleteProduct, getAllProducts, getProductById, searchProduct, updateProduct } from "../Controllers/productController.js";

const productRouter = express.Router();

productRouter.get("/" , getAllProducts)
productRouter.get("/search/:query" , searchProduct)
productRouter.post("/" , createProduct)
productRouter.delete("/:productId" , deleteProduct)
productRouter.put("/:productId", updateProduct)
productRouter.get("/:productId" , getProductById)


export default productRouter;