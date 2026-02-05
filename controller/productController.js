const Product = require("../models/productModel");

// Register a new product
exports.registerProduct = async (req, res) => {
  try {
    console.log('📦 Product registration request received');
    console.log('Request body:', { ...req.body, image: req.body.image ? 'base64_data' : null });
    
    const { productName, category, description, price, stock, brand, image } = req.body;

    // Validation
    if (!productName || !category || price === undefined || stock === undefined) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: productName, category, price, and stock"
      });
    }

    // Convert and validate price
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      console.log('❌ Validation failed: Invalid price');
      return res.status(400).json({
        success: false,
        message: "Price must be a valid number greater than 0"
      });
    }

    // Convert and validate stock
    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      console.log('❌ Validation failed: Invalid stock');
      return res.status(400).json({
        success: false,
        message: "Stock must be a valid number (0 or greater)"
      });
    }

    // Create new product
    const newProduct = new Product({
      productName: productName.trim(),
      category,
      description: description ? description.trim() : "",
      price: priceNum,
      stock: stockNum,
      brand: brand ? brand.trim() : "",
      image: image || null
    });

    console.log('💾 Attempting to save product to database...');
    
    // Save to database
    const savedProduct = await newProduct.save();

    console.log('✅ Product saved successfully:', savedProduct._id);

    res.status(201).json({
      success: true,
      message: "Product registered successfully",
      product: savedProduct
    });

  } catch (error) {
    console.error("❌ Error registering product:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A product with this name already exists"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to register product",
      error: error.message
    });
  }
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    console.log('📋 Fetching all products...');
    const { category, inStock, featured, search } = req.query;
    
    // Build filter object
    let filter = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    
    if (inStock === 'true') {
      filter.inStock = true;
    }
    
    if (featured === 'true') {
      filter.featured = true;
    }

    // Search by product name, description, or brand
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    console.log(`✅ Found ${products.length} products`);

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
};

// Get single product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Fetching product with ID: ${id}`);

    const product = await Product.findById(id);

    if (!product) {
      console.log('❌ Product not found');
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log('✅ Product found');
    res.status(200).json({
      success: true,
      product
    });

  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`📝 Updating product ID: ${id}`);
    console.log('Update data:', { ...updateData, image: updateData.image ? 'base64_data' : null });

    // Validate price if being updated
    if (updateData.price !== undefined) {
      const priceNum = Number(updateData.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid number greater than 0"
        });
      }
      updateData.price = priceNum;
    }

    // Validate stock if being updated
    if (updateData.stock !== undefined) {
      const stockNum = Number(updateData.stock);
      if (isNaN(stockNum) || stockNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock must be a valid number (0 or greater)"
        });
      }
      updateData.stock = stockNum;
      updateData.inStock = stockNum > 0;
    }

    // Trim string fields
    if (updateData.productName) updateData.productName = updateData.productName.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.brand) updateData.brand = updateData.brand.trim();

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      console.log('❌ Product not found');
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log('✅ Product updated successfully');
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct
    });

  } catch (error) {
    console.error("❌ Error updating product:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message
    });
  }
};

// Delete product (soft delete)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Soft deleting product ID: ${id}`);

    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!product) {
      console.log('❌ Product not found');
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log('✅ Product soft deleted');
    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message
    });
  }
};

// Permanently delete product
exports.permanentDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Permanently deleting product ID: ${id}`);

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      console.log('❌ Product not found');
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log('✅ Product permanently deleted');
    res.status(200).json({
      success: true,
      message: "Product permanently deleted"
    });

  } catch (error) {
    console.error("❌ Error permanently deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message
    });
  }
};

// Update product stock
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    console.log(`📦 Updating stock for product ID: ${id}, new stock: ${stock}`);

    const stockNum = Number(stock);
    if (stock === undefined || isNaN(stockNum) || stockNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid stock quantity is required (0 or greater)"
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { stock: stockNum, inStock: stockNum > 0, updatedAt: Date.now() },
      { new: true }
    );

    if (!product) {
      console.log('❌ Product not found');
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log('✅ Stock updated successfully');
    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      product
    });

  } catch (error) {
    console.error("❌ Error updating stock:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update stock",
      error: error.message
    });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    console.log(`🏷️ Fetching products for category: ${category}`);

    const products = await Product.find({ 
      category, 
      isActive: true 
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${products.length} products in category ${category}`);
    res.status(200).json({
      success: true,
      count: products.length,
      category,
      products
    });

  } catch (error) {
    console.error("❌ Error fetching products by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
};

// Get featured products
exports.getFeaturedProducts = async (req, res) => {
  try {
    console.log('⭐ Fetching featured products...');
    
    const products = await Product.find({ 
      featured: true, 
      isActive: true,
      inStock: true 
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`✅ Found ${products.length} featured products`);
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    console.error("❌ Error fetching featured products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured products",
      error: error.message
    });
  }
};