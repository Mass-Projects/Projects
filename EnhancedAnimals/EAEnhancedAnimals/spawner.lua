--DEER--
Citizen.CreateThread(function()
    RequestModel(GetHashKey("a_c_deer"))
	
    while not HasModelLoaded(GetHashKey("a_c_deer")) do
        Wait(1)
    end
	
	if Config.Deer = true 
	then for _, item in pairs(Config.DeerSpawn) do local npc = CreatePed(4, 0xA1435105, item.x, item.y, item.z, item.heading, false, true)
			
			SetEntityHeading(npc, item.heading)
			FreezeEntityPosition(npc, false)
			SetEntityInvincible(npc, false)
			SetBlockingOfNonTemporaryEvents(npc, false)
		end
	end
end)


--BOAR--
