const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
    maxlength: [100, "Product name cannot exceed 100 characters"]
  },
  category: {
    type: String,
    required: [true, "Product category is required"],
    enum: {
      values: [
        "Food & Treats",
        "Toys",
        "Grooming",
        "Health & Wellness",
        "Beds & Furniture",
        "Collars & Leashes",
        "Bowls & Feeders",
        "Carriers & Crates",
        "Clothing & Accessories",
        "Training & Behavior"
      ],
      message: "{VALUE} is not a valid category"
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
    default: ""
  },
  price: {
    type: Number,
    required: [true, "Product price is required"],
    min: [0, "Price cannot be negative"]
  },
  stock: {
    type: Number,
    required: [true, "Stock quantity is required"],
    min: [0, "Stock cannot be negative"],
    default: 0
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, "Brand name cannot exceed 50 characters"],
    default: ""
  },
  image: {
    type: String, // Base64 encoded image or URL
    default: null
  },
  inStock: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, "Rating cannot be negative"],
    max: [5, "Rating cannot exceed 5"]
  },
  reviews: {
    type: Number,
    default: 0,
    min: [0, "Number of reviews cannot be negative"]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update inStock based on stock quantity before saving
productSchema.pre("save", function() {
  this.inStock = this.stock > 0;
});

// Update inStock when stock is updated
productSchema.pre("findOneAndUpdate", function() {
  const update = this.getUpdate();
  if (update.stock !== undefined) {
    update.inStock = update.stock > 0;
  }
});

// Virtual for formatted price
productSchema.virtual("formattedPrice").get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Index for better query performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ productName: "text", description: "text", brand: "text" });
productSchema.index({ price: 1 });
productSchema.index({ featured: -1, createdAt: -1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;   