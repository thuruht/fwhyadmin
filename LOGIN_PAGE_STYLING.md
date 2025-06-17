# Login Page Styling Requirements

The login page for the admin system needs to be styled to match the overall site theme and 404 page style.

## Current Issues:
- Login page has default/minimal styling
- Doesn't match the Farewell/Howdy brand identity
- Missing consistent fonts, colors, and layout elements

## Styling Requirements:

### Layout and Structure
- Header should match the 404 page header with Farewell/Howdy branding
- Background should use var(--header-bg) with appropriate background image
- Container for login form should use the card style from the main site

### Typography
- Use the site's font variables (var(--font-main), var(--font-db), etc.)
- Header text should use the same styling as the 404 page header
- Form labels and text should use consistent typography

### Colors
- Use the site's color variables (var(--primary-bg-color), var(--secondary-bg-color), etc.)
- Button colors should match the main site buttons
- Error messages should be styled consistently

### Form Elements
- Input fields should match the styling in the main site forms
- Button should match the "TAKE ME HOME" button on the 404 page
- Add appropriate hover/focus states

### Responsive Design
- Layout should respond properly to different screen sizes
- Typography should scale appropriately

## Implementation Notes:
- Use the site's main CSS file as a base
- Add login-specific overrides as needed
- Ensure all interactive elements are accessible

## Example HTML Structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Admin Login - Farewell/Howdy</title>
    <link rel="stylesheet" href="https://dev.farewellcafe.com/css/ccssss.css">
    <!-- Additional login-specific styles -->
</head>
<body data-state="farewell">
    <header class="feader" style="min-height:212px;">
        <!-- Header content similar to 404 page -->
    </header>
    
    <main>
        <div class="login-container">
            <h1 class="login-title">Admin Login</h1>
            <form id="login-form">
                <!-- Form fields -->
                <button type="submit" class="home-link">LOGIN</button>
            </form>
        </div>
    </main>
</body>
</html>
```

Target completion date: June 20, 2025
