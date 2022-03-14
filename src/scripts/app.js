function loadTexture(path) {
    return new Promise((resolve) => {
        const image = new Image()
        image.src = path
        image.onload = () => {
            resolve(image)
        }
    })
}

class ImageLoader {
    factions = ['red', 'black'];
    types = ['rook', 'knight', 'cannon', 'elephant', 'mandarin', 'king', 'pawn'];

    constructor(basePath) {
        this._basePath = basePath
        this._images = {}
        this._tasks = []
    }

    _loadImage(path, name, ext) {
        this._tasks.push(loadTexture(`${path}/${name}${ext}`).then((image) => {
            this._images[name] = image
        }))
    }

    _loadPiecesImages() {
        const piecesImagePath = `${this._basePath}/pieces`
        let ext = ".png"
        for (const faction of this.factions) {
            for (const type of this.types) {
                let name = `${faction}_${type}`
                this._loadImage(piecesImagePath, name, ext)
            }
        }
    }

    _loadUtilImages() {
        const utilImagePath = `${this._basePath}/util`
        let ext = ".png"
        for (const faction of this.factions) {
            let name = `${faction}_selected`
            this._loadImage(utilImagePath, name, ext)
        }
        this._loadImage(utilImagePath, "dot", ext)
    }


    _loadGameImage() {
        this._loadImage(this._basePath, "background", ".jpg")
        this._loadImage(this._basePath, "board", ".png")
    }

    async load() {
        this._loadPiecesImages()
        this._loadUtilImages()
        this._loadGameImage()
        await Promise.all(this._tasks)
    }

    get(name) {
        return this._images[name]
    }
}


class ChessPiece {
    constructor(faction, type) {
        this.x = 0
        this.y = 0
        this.faction = faction
        this.type = type
        this.selected = false
        this.dead = false
    }
}

const themes = [
    {
        imagePath: "assets/images",
        width: 325,
        height: 403,
        startX: 5,
        startY: 19,
        stepX: 35,
        stepY: 36
    }
]

class TextureFactory {

    constructor(config) {
        this.config = config
        this.imageLoader = new ImageLoader(config.imagePath)
    }

    async init() {
        await this.imageLoader.load()
    }

    loadImage(name) {
        return this.imageLoader.get(name)
    }

    board() {
        return this.loadImage("board")
    }

    piece(faction, type) {
        return this.loadImage(`${faction}_${type}`)
    }

    selected(faction) {
        return this.loadImage(`${faction}_selected`)
    }


}

class Game {
    constructor() {
        this._canvas = document.getElementById("app")
        this._textureFactory = new TextureFactory(themes[0])
        this._pieces = []
        this._selected = null
        this._activeFaction = "red"
        this._pieceCoordinate = {}
    }

    drawFrame() {
        let canvas = this._canvas
        let ctx = canvas.getContext('2d')
        let pieces = this._pieces

        let textureFactory = this._textureFactory
        let textureConfig = this._textureFactory.config
        let board = textureFactory.board()

        canvas.width = textureConfig.width
        canvas.height = textureConfig.height
        ctx.drawImage(board, 0, 0)

        let startX = textureConfig.startX
        let startY = textureConfig.startY
        let stepX = textureConfig.stepX
        let stepY = textureConfig.stepY

        for (const piece of pieces) {
            let xAbs = (piece.x - 1) * stepX + startX
            let yAbs = (piece.y - 1) * stepY + startY
            ctx.drawImage(textureFactory.piece(piece.faction, piece.type), xAbs, yAbs)
            if (piece.selected) {
                ctx.drawImage(textureFactory.selected(piece.faction), xAbs, yAbs)
            }
        }
    }

    coordinatePlacement(side) {
        if (side !== "top" && side !== "bottom") {
            throw new Error(`invalid side: ${side}`)
        }
        let coordinates = []
        for (let i = 1; i < 10; i++) {
            /* bottom line */
            coordinates.push([i, 1])
        }
        /*  top line of palace  */
        coordinates.push([2, 3])
        coordinates.push([8, 3])
        /* line of pawn */
        for (let i = 1; i < 10; i += 2) {
            coordinates.push([i, 4])
        }
        if (side === "bottom") {
            for (let coordinate of coordinates) {
                coordinate[1] = 11 - coordinate[1]
            }
        }
        return coordinates
    }

    piecePlacement(faction) {
        let types = [
            'rook', 'knight', 'elephant', 'mandarin', 'king', 'mandarin', 'elephant', 'knight', 'rook',
            'cannon', 'cannon',
            'pawn', 'pawn', 'pawn', 'pawn', 'pawn'
        ]
        let pieces = []
        for (const type of types) {
            pieces.push(new ChessPiece(
                faction,
                type
            ))
        }
        return pieces
    }

    createFaction(faction, side) {
        let coordinates = this.coordinatePlacement(side)
        let pieces = this.piecePlacement(faction)
        console.assert(coordinates.length === pieces.length)
        for (let i = 0; i < pieces.length; i++) {
            let piece = pieces[i]
            let coordinate = coordinates[i];
            piece.x = coordinate[0]
            piece.y = coordinate[1]
            this._pieceCoordinate[`${coordinate[0]}_${coordinate[1]}`] = piece
            this._pieces.push(piece)
        }
    }

    init() {
        let textureFactory = this._textureFactory
        textureFactory.init().then(() => {
            this.createFaction("black", "top")
            this.createFaction("red", "bottom")
            this.drawFrame()
            this._canvas.addEventListener("click", (event) => {
                let canvas = this._canvas
                const rect = canvas.getBoundingClientRect()
                const x = event.clientX - rect.left
                const y = event.clientY - rect.top
                this.onClick(x, y)
            })
        })
    }

    boardClick(x, y) {
        console.log(x, y)
        console.log(this._pieceCoordinate)
        let piece = this._pieceCoordinate[`${x}_${y}`]
        if (piece != null && piece.faction === this._activeFaction) {
            // 如果选择了当前阵营，则意味着重新选取棋子
            if (this._selected != null) {
                this._selected.selected = false
            }
            if (this._selected === piece) {
                this._selected = null
            } else {
                this._selected = piece
                this._selected.selected = true
            }
            this.drawFrame()
            return
        }
        if (this._selected != null) {
            // 是否满足移动规则，如果满足移动规则，则移动或者吃子，进入下一个回合，否则不采取行动
            
        }
    }

    onClick(xAbs, yAbs) {
        let textureConfig = this._textureFactory.config
        let startX = textureConfig.startX
        let startY = textureConfig.startY
        let stepX = textureConfig.stepX
        let stepY = textureConfig.stepY
        let x = Math.floor((xAbs - startX) / stepX + 1)
        let y = Math.floor((yAbs - startY) / stepY + 1)
        if (x < 0 || x > 9 || y < 0 || y > 10) {
            return
        }
        this.boardClick(x, y)
    }

}

const game = new Game()
game.init()