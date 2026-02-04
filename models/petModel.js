const mongoose = require("mongoose");

const petRegistrationSchema = new mongoose.Schema(
  {
    owner: {
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
      password: {
        type: String,
        required: true,
        minlength: 8,
        select: false, // hidden by default
      },
      phone: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        default: "owner",
      },
    },

    pet: {
      name: { type: String, required: true },
      type: { type: String, default: "Dog" },
      breed: { type: String, required: true },
      age: { type: String, required: true },
      gender: { type: String, default: "Male" },
      location: { type: String, required: true },
      description: { type: String, required: true },
      vaccinated: { type: Boolean, default: false },
      trained: { type: Boolean, default: false },

      // Photos array (base64 strings or URLs)
      photos: {
        type: [String],
        default: [],
      },

      // License can be base64 string, URL, or plain text
      license: {
        type: String,
        required: true,
      },
      
      // ✅ NEW: Adoption status
      adoptionStatus: {
        type: String,
        enum: ["available", "adopted", "pending_adoption"],
        default: "available",
      },
    },

    // Registration status field
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // ✅ NEW: Adoption records - tracks who adopted this pet
    adoptions: [
      {
        adopterEmail: {
          type: String,
          required: true,
        },
        adopterName: {
          type: String,
          required: true,
        },
        adopterPhone: {
          type: String,
          required: true,
        },
        adopterMessage: {
          type: String,
        },
        adoptionDate: {
          type: Date,
          default: Date.now,
        },
        adoptionStatus: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
      }
    ],

    // Active status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Login attempts tracking
    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
    },

    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Password comparison (plain text - for learning only)
petRegistrationSchema.methods.comparePassword = function (candidatePassword) {
  return candidatePassword === this.owner.password;
};

// Check if account is locked
petRegistrationSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
petRegistrationSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// Reset login attempts
petRegistrationSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Check if password was changed after JWT was issued
petRegistrationSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model("petregistrations", petRegistrationSchema);