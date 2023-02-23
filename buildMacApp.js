const embler = require('embler')

const config = {
    name: "gabin",
    author: "OneClickStudio",
    version: "0.2.0",
    embler: {
        realName: "Gabin",
        appId: "com.oneclickstudio.gabin",
        mac: {
            binary: "./dist/gabin",
            icon: "./src/resources/icons/icon.png",
            formats: ["app"],
            category: "public.app-category.video"
        }
    }
}

const main = async () => {
    const arch = process.argv[2]

    if (arch) {
        config.embler.realName += "-" + arch
        config.embler.mac.binary += "-" + arch
    }

    // BUILD APP
    await embler.build(config)
}

main()