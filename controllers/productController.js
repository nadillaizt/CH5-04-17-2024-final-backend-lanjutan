const multer = require("multer");
const { Product, Shop, User } = require("../models");
const imagekit = require("../lib/imagekit");
const ApiError = require("../utils/apiError");
const { Op } = require("sequelize");

const createProduct = async (req, res, next) => {
  const { name, price, stock } = req.body;
  const files = req.files;
  let images = [];

  try {
    if (files) {
      await Promise.all(
        files.map(async (file) => {
          // dapatkan extension file nya
          const split = file.originalname.split(".");
          const extension = split[split.length - 1];

          // upload file ke imagekit
          const uploadedImage = await imagekit.upload({
            file: file.buffer,
            fileName: `IMG-${Date.now()}.${extension}`,
          });
          images.push(uploadedImage.url);
        })
      );
    }

    const newProduct = await Product.create({
      name,
      price,
      stock,
      imageUrl: images,
      userId: req.user.id,
      shopId: req.user.shopId,
    });

    res.status(200).json({
      status: "Success",
      data: {
        newProduct,
      },
    });
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

const findProducts = async (req, res, next) => {
  try {
    const { productname, username, shop, page, limit } = req.query;
    const condition = {};
    if (productname) condition.name = { [Op.iLike]: `%${productname}%` };

    const includeShopCondition = {};
    if (shop) includeShopCondition.name = { [Op.iLike]: `%${shop}%` };

    const includeUserCondition = {};
    if (username) includeUserCondition.name = { [Op.iLike]: `${username}%` };

    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (pageNum - 1) * pageSize;

    let whereCondition = condition;

    if (req.user.role === "Admin") {
      whereCondition;
    } else {
      whereCondition = {
        ...condition,
        shopId: req.user.shopId,
      };
    }

    const totalCount = await Product.count({ where: whereCondition });

    const products = await Product.findAll({
      include: [
        {
          model: Shop,
          where: includeShopCondition,
          attributes: ["id", "name"],
        },
        {
          model: User,
          attributes: ["name"],
        },
      ],
      where: whereCondition,
      order: [["id", "ASC"]],
      attributes: ["name", "price", "stock", "createdAt", "updatedAt"],
      limit: pageSize,
      offset: offset,
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: "Success",
      data: {
        products,
        pagination: {
          totalData: totalCount,
          totalPages,
          pageNum,
          pageSize,
        },
      },
    });
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

const findProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
      },
    });

    if (product.shopId !== req.user.shopId) {
      return next(
        new ApiError("KAMU BUKAN DARI TOKO PEMILIK PRODUK TERSEBUT !!!!", 400)
      );
    }

    res.status(200).json({
      status: "Success",
      data: {
        product,
      },
    });
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

const UpdateProduct = async (req, res, next) => {
  const { name, price, stock } = req.body;
  try {
    const product = await Product.update(
      {
        name,
        price,
        stock,
      },
      {
        where: {
          id: req.params.id,
        },
      }
    );

    res.status(200).json({
      status: "Success",
      message: "sukses update produk",
    });
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

const deleteProduct = async (req, res, next) => {
  const { name, price, stock } = req.body;
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
      },
    });

    if (!product) {
      next(new ApiError("Product id tersebut gak ada", 404));
    }

    await Product.destroy({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).json({
      status: "Success",
      message: "sukses delete produk",
    });
  } catch (err) {
    next(new ApiError(err.message, 400));
  }
};

module.exports = {
  createProduct,
  findProducts,
  findProductById,
  UpdateProduct,
  deleteProduct,
};
