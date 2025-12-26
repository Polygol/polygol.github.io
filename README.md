<img width="1200" height="630" alt="Polygol" src="https://github.com/user-attachments/assets/80472d9e-976b-45e9-8988-2cf2ea18d2f0" />

# Polygol
⏰ Ambient OS-like dashboard with clock, weather and advanced features without tracking you or displaying ads.

**[>> You can access Polygol at https://polygol.github.io <<]**

Documentation at https://kirbindustries.gitbook.io/polygol


> [!TIP]
> Polygol will run on any device with a HTML5 web browser.
> We are designed to replace the regular dashboard experience (FireOS, etc.).
> You can use Polygol as a substitute for better experiences for limited devices.

# Features
* Cross device functionality with Waves
* Extensive wallpaper based customization with Custom CSS
* Integration with applications
* Beautiful Dynamic Glass UI
* Smart AI assistant

# Roadmap
* Extend language support
* Add QoL features for limited devices
* Modularize code
* Remove redundancy incode
* Reduce file sizes

# Quick Questions 
### "The device goes back to the home screen."
* Open Settings in Polygol
* Open System
* In Browser section, set Keep Polygol on to "Legacy"

### "Why is there no clock app?"
You must install it from the App Store.

### "How to use GuraAI?"
You must have a Google AI Studio Gemini key. 
* Open Settings in Polygol
* Open General
* In GuraAI section, turn on GuraAI. It will ask for your key!"

### "How to transfer my data?"
Use https://polygol.github.io/transfer

### "It runs slow on my device."
If this is the case, try to:
* Open Settings in Polygol
* Open Display
* Enable Contrast
* Disable Dynamic Glass
* Disable Motion

# Gurapp Applications
Gurapp can extend your Polygol experience. The GitHub repository for each application are seperate from the `polygol.github.io` GitHub repository.

# Boot States & URL Parameters
Polygol includes a Boot State System that runs immediately upon page load (before the OS initializes).

If a user visits index.html without any parameters and has not completed the setup process, they are automatically redirected to the landing page.
## Boot Commands
You can control the startup behavior using the ?s= query parameter. The URL is automatically cleaned after the command executes.

| Parameter | Action | Description |
| :--- | :--- | :--- |
| `?s=oobe` | **Force Setup** | Clears the "visited" flag and forces the Out-of-Box Experience (Setup Screen) to launch. Useful for resetting or testing the onboarding flow. |
| `?s=nooobe` | **Skip Setup** | Sets the "visited" flag to true and bypasses the Setup Screen, taking the user directly to the Desktop. |
| `?s=manage&url=[URL]` | **Import Config** | Fetches a raw text/JS file from the provided `[URL]`, saves it as a `customStartupScript`, marks setup as complete, and loads the OS. Useful for remote management or custom deployments. |
| `?s=[AppName]` | **Deep Link** | Skips setup and immediately launches the specified app once the system loads (e.g., `?s=Terminal`). |

#### Examples

* Reset and start fresh:
`https://polygol.github.io/?s=oobe`
* Skip setup entirely:
`https://polygol.github.io/?s=nooobe`
* Open the Terminal immediately:
`https://polygol.github.io/?s=Terminal`
* Load a custom configuration script:
`https://polygol.github.io/?s=manage&url=https://example.com/my-config.js`

# Local Run
* Applications: You must download the Gurapps from each GitHub repository and place them in the root directory in order for Gurapps to work correctly with Polygol locally.
* Assets: You must edit the directory path in the code, since every path assumes that the asset is in root.

# I HATE MISSING ASSETS
If you see images of Fanny BFDI, the assets could not be found. If you are running locally, make sure you have followed the steps.

# Forking
You must replace the contents of these folders:
* appicon
* img
* marketing

# Acknowledgements
* Application Icons: kirbIndustries
* Timer Sound: Google
* Fallback Fanny: jacknjellify
* Setup Music: Brittle Rille - Reunited by Kevin MacLeod (CC BY 4.0)
* UI Sounds from Notification Sounds (https://notificationsounds.com, CC BY 4.0)

(This is not the entire list. Check the repo for more information.)

---

© Copyright kirbIndustries 2024-2026

You are free to do anything to the code under the Do What The F*ck You Want To Public License.

You may not use our brand in any method not authorized, including identifiable visual assets.

AI Notice: Some sections of code are generated with various AI models. However, AI is not used at all for visual assets, such as Gurapp Icons.
