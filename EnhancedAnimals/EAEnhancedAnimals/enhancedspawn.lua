--DEER--
Citizen.CreateThread(function()
  RequestModel(GetHashKey("a_c_deer"))
  HasModelLoaded("a_c_deer") then CreatePed( 
		modelHash GetHashKey("a_c_deer"), 
		x --[[ number ]], 
		y --[[ number ]], 
		z --[[ number ]], 
		heading --[[ number ]], 
		isNetwork --[[ boolean ]], 
		bScriptHostPed --[[ boolean ]]
	)
    Citizen.Wait(1900)
--This is idk junk lol--

    end  
  end
end)
  )
)
