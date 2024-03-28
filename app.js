import express from "express"
import mongoose from "mongoose"
import path from "path"
import __dirname from "./src/utils.js"
import handlebars from "express-handlebars"
import { Server } from "socket.io"
import cartRouter from "./src/routes/cartRouter.js"
import productRouter from "./src/routes/productsRouter.js"
import viewsRouter from "./src/routes/viewsRouter.js"
import ProductsManagerDao from "./src/dao/services/productManager.js"
import productsModel from "./src/dao/models/productsModel.js"
import MessagesManagerDao from "./src/dao/services/messagesManager.js"


const app = express()
const PORT = process.env.PORT || 8080
const nuevaRuta = path.join('C:', 'Users', 'julia', 'Desktop', 'AreaDeTrabajo', 'backendDesafios', 'src');

// Asignar la nueva ruta a __dirname
global.__dirname = nuevaRuta;

// Configuración de Handlebars y vistas
app.set('views', path.join(global.__dirname,'/views'))
app.engine('handlebars', handlebars.engine())
app.set('view engine', 'handlebars')

// Midlewares
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//Configuración de arcivos estáticos
app.use(express.static(path.join(global.__dirname,'/public')))

// Configurar la conexión a MongoDB.
const conectMongoDB = async() => {
    const DB_URL = 'mongodb+srv://julianDubuisson:<password>@cluster0.gtbwigq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
    try {                       
        await mongoose.connect(DB_URL)
        console.log("Conectado a MongoDB")
    } catch (error) {
        console.log("No se pudo conectar a la DB",error)
        process.exit() // Detener la ejecución del servidor si no se puede conectar a la DB.
    }
}

conectMongoDB()

// Configurar las rutas.
app.use('/api/products/', productRouter)
app.use('/api/carts/', cartRouter)
app.use(viewsRouter)

//Inicialización del server y socket.io
const server = app.listen(PORT, () => {
    console.log(`Server corriendo en el puerto ${PORT}`)
})

const io = new Server(server)
const productManager = new ProductsManagerDao()
const messagesManager = new MessagesManagerDao()

// Manejo de eventos de socket.io
io.on('connection', socket => {
    console.log('Conectado')

    socket.on('initialProducts', async()=>{
        socket.emit('productList', await productManager.getProducts())
    })
    
    socket.on('newProduct', async (product) => {
        await productManager.addProduct(product)
        console.log("Servidor/evento newProduuct:", product)
        
        io.emit('productList', await productManager.getProducts())
    })
    
    socket.on('deleteProduct', async (productId) => {
        await productManager.deleteProductById(productId)
        console.log("Servidor/evento deleteProduct:", productId)

        io.emit('productList', await productManager.getProducts())
    })

    socket.on('messageLogs', async (data) =>{
        console.log("Servidor/evento message:", data)
        await messagesManager.addMessage(data)
        io.emit('messageLogs', await messagesManager.getAllMessages())
    })
})
