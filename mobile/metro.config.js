// Metro bundles the iOS app. The game itself lives in ../src and is shared with the web
// build, so Metro has to watch that folder too. Packages the game imports (the font) are
// always resolved from mobile/node_modules: EAS only installs this folder's dependencies.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)
const gameSrc = path.resolve(__dirname, '../src')

config.watchFolders = [...config.watchFolders, gameSrc]

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isPackage = !moduleName.startsWith('.') && !path.isAbsolute(moduleName)
  if (isPackage && context.originModulePath.startsWith(gameSrc + path.sep)) {
    context = { ...context, originModulePath: path.join(__dirname, 'package.json') }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
