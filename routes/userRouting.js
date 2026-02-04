const express = require('express')
const userController = require('../controller/userController')
const router = new express.Router()

// Define path for client api request

// ==================== PUBLIC ROUTES ====================

// register
router.post('/register', userController.registerController)

// login
router.post('/login', userController.loginController)

// ✅ Admin routes
router.post('/admin/login', userController.adminLoginController)
router.post('/admin/create', userController.createAdminController)

// ==================== PROTECTED ROUTES ====================
// Add middleware here if needed for protected routes

// Get all users (admin only - add auth middleware as needed)
router.get('/users', userController.getAllUsersController)

module.exports = router