{
  "abbreviation": "string",
  "givenName": "string",
  "surname": "string",
  "middleName": "string",
  "dateOfBirth": "2025-07-25T21:37:49.812Z",
  "gender": "Other",
  "email": "user@example.com",
  "generalCategoryId": 0,
  "useTransportation": true,
  "maritalStatusId": 0,
  "homePhone": "string",
  "mobilePhone": "string",
  "workPhone": "string",
  "work": "string",
  "mentor": {
    "id": 0,
    "type": "None"
  },
  "customizableField1": "string",
  "dynamicField1Id": 0,
  "dynamicField2Id": 0,
  "dynamicField3Id": 0,
  "dynamicField4Ids": [
    769
  ],
  "dynamicField5Id": 0,
  "dynamicField6Id": 0,
  "comments": "string",
  "externalId": "string",
  "freeTextField": "string",
  "customFieldTxt1": "string",
  "customFieldTxt2": "string",
  "customFieldTxt3": "string",
  "customFieldTxt4": "string",
  "customFieldCheckBox1": true,
  "customFieldCheckBox2": true,
  "customFieldCheckBox3": true,
  "customFieldCheckBox4": true,
  "customFieldDropDown1": 0,
  "customFieldDropDown2": 0,
  "customFieldDropDown3": 0,
  "customFieldDropDown4": 0,
  "customFieldDropDown5": 0,
  "customFieldDropDown6": 0,
  "customFieldMultiDropDown1": [
    0
  ],
  "customFieldMultiDropDown2": [
    0
  ],
  "customFieldDate1": "2025-07-25T21:37:49.812Z",
  "customFieldDate2": "2025-07-25T21:37:49.812Z",
  "applicationSubmitted": true,
  "image": "string"
}

768: "Unpaid"
769: "Fall 2025 Semester Enrollment Fee"

curl -X 'PUT' \
  'https://consumerapi.classter.com/api/students/2637' \
  -H 'accept: */*' \
  -H 'X-Institute-Tenant: 2A2200B3-07AA-4E3B-A557-14E5C9CF2C30' \
  -H 'X-Institute-Period: 1' \
  -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6ImlDQWt4X3RKWnBVX3NXRHBKcFFnRGdESndCcyIsImtpZCI6ImlDQWt4X3RKWnBVX3NXRHBKcFFnRGdESndCcyJ9.eyJpc3MiOiJodHRwczovL2lkZW50aXR5LXN0cy5jbGFzc3Rlci5jb20vaXNzdWVyIiwiYXVkIjoiaHR0cHM6Ly9pZGVudGl0eS1zdHMuY2xhc3N0ZXIuY29tL2lzc3Vlci9yZXNvdXJjZXMiLCJleHAiOjIwOTc3ODc3MTYsIm5iZiI6MTYyNDQzMzQzNiwiY2xpZW50X2lkIjoiMzVlZjc0YWYtNjU4ZS00YWUxLWEzMWItMzdmNzE2Njc1ZThlIiwiY2xpZW50X3RlbmFudCI6ImNidHMiLCJjbGllbnRfcm9sZSI6IjE2Mzg0Iiwic2NvcGUiOiJjb25zdW1lcl9hcGkifQ.D56ma_-HRH2Kke8a7QhFLRCczzUeNQgV6UjVz9NXTuB6AdI9zM-jhIGSEXRSg9y_9IK1PEe3RKXTq3GPqDvh18PmN-xEckZRx_py9aOFvKQtAyyBCUbrrfTYxngcCJRt5p3evGScZzx-ldaUflp4Gz64lPbt-XJtfZ9IO0bRy5eMM6ipP_JFDrpRtapK5v0S2SFqjKf7tMxO8NzmbSW12eqsckNC3GvH18h1vTg_kM5G3xg1Fr0KaKcImogUAEjmyuvg9xG-BV-tveibDaVukLmW_RWv5j8-5-2P2yf4WBOIij74-_m-kiRBg1ScuopHtM2dxcK5_5gyXaDECQRT9Q' \
  -H 'Content-Type: application/vnd.cc.student.update.v1+json' \
  -d '{
  "dynamicField4Ids": [
    769
  ]
}'