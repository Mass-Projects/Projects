-- CONFIG
-------------------------------------------
--- Url to the "server" of the CAD, default port is 3001
local URL_TO_CAD = 'http://ip-to-cad-server' -- No slash at the end 
local PORT = "3001"
-------------------------------------------

-- CODE 
-------------------------------------------

-- Register chatmessage
RegisterServerEvent("chatMessage")

RegisterCommand("call911", function(source, args)
    CancelEvent()
    local name = GetPlayerName(source)
    local description = args
    TriggerClientEvent("911Call", source, name, description)
end)

-- register the updater
RegisterServerEvent("911CallUpdate")

-- POST the call to the CAD
AddEventHandler("911CallUpdate", function(street, name, description)
    PerformHttpRequest(URL_TO_CAD .. ":" .. PORT .. '/global/create-911-call',
                       function(err, text, headers) end, 'POST',
                       json.encode({caller = name, location = street, description = table.concat(description, ' ')}),
                       {["Content-Type"] = 'application/json'})

    CancelEvent()
end)

-- CODE
-------------------------------------------