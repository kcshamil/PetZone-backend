const multer = require('multer')



// where to stire image file in the server app
const storage = multer.diskStorage({
    destination : (req,file,cb)=>{
        cb(null,'./uploads')
    },
    filename : (req,file,cb)=>{
        cb(null,`Image-${Date.now()}-${file.originalname}`)
    }
})

const fileFilter = (req,file,cb)=>{
    // only jpg png webp
    if(file.mimetype=="image/jpeg" || file.mimetype=="image.jpg" || file.mimetype=="image.png" || file.mimetype=="image.webp"){
        cb(null,true)
    }else{
        cb(null,false)
    }
}

multerMiddleware = multer({
    storage,
    fileFilter
})

module.exports = multerMiddleware