const express = require('express')
const userController = require('../controller/userController')
const router = new express.Router()

// ==================== PUBLIC ROUTES ====================

// register
router.post('/register', userController.registerController)

// login
router.post('/login', userController.loginController)

// google login
router.post('/google/sign-in', userController.googleLoginController)

// Admin routes
router.post('/admin/login', userController.adminLoginController)
router.post('/admin/create', userController.createAdminController)

// ==================== PROTECTED ROUTES ====================
// Get all users 
router.get('/users', userController.getAllUsersController)

module.exports = router