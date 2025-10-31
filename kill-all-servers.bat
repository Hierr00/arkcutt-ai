@echo off
echo Killing all Node.js processes...
taskkill /F /IM node.exe /T 2>nul
echo.
echo Cleaning Next.js cache...
if exist .next (
    rmdir /s /q .next
    echo Cache cleaned!
) else (
    echo Cache already clean
)
echo.
echo Done! You can now run: npm run dev
pause
