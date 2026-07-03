UPDATE skatteverket_credentials 
SET client_secret_encrypted = 'd70f147fea15edc68cb6b6a08f023337d1171eec26bc3a4beb2189e169770069',
    environment = 'test'
WHERE client_id = '4b43c546646c3b8b9371d97690e43a4beb2189e169770069'
AND environment = 'production';