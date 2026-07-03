UPDATE skatteverket_credentials 
SET client_secret_encrypted = 'c64d659cde1793d55333ba87c8b94f88fbc424070bb816390be714a852ea0069',
    environment = 'production'
WHERE client_id = '4b43c546646c3b8b9371d97690e43a4beb2189e169770069' 
AND environment = 'production';