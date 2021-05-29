fx_version 'cerulean'
game 'gta5'

author 'MassProjects'
description 'A resource that spawns animals!'
version '0.0.1'

-- What to run
client_scripts {
    'distancecheck.lua'
}
server_scripts {
    'config.lua',
    'spawner.lua,
    'stream/*',
    'animals/*'
}


