#!/bin/bash

echo "🚀 Echo Messaging API Test Suite"
echo "================================="

BASE_URL="http://localhost:8080/api"

# Test 1: Registration
echo "📝 Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register -H "Content-Type: application/json" -d '{"username":"testuser1","email":"test1@example.com","password":"test123"}')
echo "Registration Response: $REGISTER_RESPONSE"

# Test 2: Login
echo "🔐 Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login -H "Content-Type: application/json" -d '{"username":"testuser1","password":"test123"}')
echo "Login Response: $LOGIN_RESPONSE"

# Extract JWT token
JWT_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "JWT Token extracted: ${JWT_TOKEN:0:50}..."

# Test 3: Get Current User
echo "👤 Testing Get Current User..."
CURRENT_USER_RESPONSE=$(curl -s -X GET $BASE_URL/auth/getcurrentuser -H "Authorization: Bearer $JWT_TOKEN")
echo "Current User Response: $CURRENT_USER_RESPONSE"

# Test 4: Get Online Users
echo "🌐 Testing Get Online Users..."
ONLINE_USERS_RESPONSE=$(curl -s -X GET $BASE_URL/auth/getonlineusers -H "Authorization: Bearer $JWT_TOKEN")
echo "Online Users Response: $ONLINE_USERS_RESPONSE"

# Test 5: Get Public Messages
echo "💬 Testing Get Public Messages..."
PUBLIC_MESSAGES_RESPONSE=$(curl -s -X GET $BASE_URL/messages/public -H "Authorization: Bearer $JWT_TOKEN")
echo "Public Messages Response: $PUBLIC_MESSAGES_RESPONSE"

# Test 6: Get Private Messages (between same user for testing)
echo "🔒 Testing Get Private Messages..."
PRIVATE_MESSAGES_RESPONSE=$(curl -s -X GET "$BASE_URL/messages/private?user1=testuser1&user2=testuser1" -H "Authorization: Bearer $JWT_TOKEN")
echo "Private Messages Response: $PRIVATE_MESSAGES_RESPONSE"

echo "✅ API Testing Complete!"
echo "========================"
echo "📊 Test Results Summary:"
echo "- Registration: $(echo $REGISTER_RESPONSE | grep -q 'username' && echo '✅ SUCCESS' || echo '❌ FAILED')"
echo "- Login: $(echo $LOGIN_RESPONSE | grep -q 'token' && echo '✅ SUCCESS' || echo '❌ FAILED')"
echo "- Current User: $(echo $CURRENT_USER_RESPONSE | grep -q 'username' && echo '✅ SUCCESS' || echo '❌ FAILED')"
echo "- Online Users: $(echo $ONLINE_USERS_RESPONSE | grep -q '{' && echo '✅ SUCCESS' || echo '❌ FAILED')"
echo "- Public Messages: $(echo $PUBLIC_MESSAGES_RESPONSE | grep -q '\[' && echo '✅ SUCCESS' || echo '❌ FAILED')"
echo "- Private Messages: $(echo $PRIVATE_MESSAGES_RESPONSE | grep -q '\[' && echo '✅ SUCCESS' || echo '❌ FAILED')"