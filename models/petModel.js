// models/petModel.js
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
        enum: ["owner", "admin"],
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

      photos: {
        type: [String],
        validate: {
          validator: (v) => v.length >= 3,
          message: "At least 3 photos required",
        },
      },

      license: {
        type: String,
        required: true,
      },
    }
  }
);

// ----------------------------------------------------
// ✅ REQUIRED STEP-4 METHOD (NO bcrypt)
// ----------------------------------------------------
petRegistrationSchema.methods.comparePassword = function (candidatePassword) {
  return candidatePassword === this.owner.password;
};

// ----------------------------------------------------
// Lock helpers
// ----------------------------------------------------
petRegistrationSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

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

petRegistrationSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

module.exports = mongoose.model("PetRegistration", petRegistrationSchema);
