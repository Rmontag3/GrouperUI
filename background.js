browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'theme-rotation') {
        rotateTheme();
    }
});

async function rotateTheme() {
    const data = await browser.storage.local.get(['rotationList', 'currentRotationIndex', 'isDarkMode']);
    const list = data.rotationList || [];
    let index = data.currentRotationIndex || 0;
    
    if (list.length === 0) return;

    // Advance Index
    index = (index + 1) % list.length;
    
    // Save new index immediately
    await browser.storage.local.set({ currentRotationIndex: index });

    // Apply
    const theme = list[index];
    applyThemeLogic(theme, data.isDarkMode);
}

function applyThemeLogic(theme, isDarkMode) {
    if (theme.type === 'builtin' || theme.type === 'addon') {
        browser.management.setEnabled(theme.id, true);
    }
    else if (theme.type === 'image') {
        browser.theme.update({
            images: { theme_frame: theme.data },
            colors: {
                frame: isDarkMode ? '#1c1b22' : '#ffffff',
                tab_background_text: isDarkMode ? '#f9f9fb' : '#15141a',
                toolbar: isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.5)',
                textcolor: isDarkMode ? '#f9f9fb' : '#15141a'
            }
        });
    }
    else if (theme.type === 'custom') {
        browser.theme.update({
            colors: {
                frame: theme.color,
                tab_background_text: isDarkMode ? '#f9f9fb' : '#15141a',
                toolbar: theme.color,
                textcolor: isDarkMode ? '#f9f9fb' : '#15141a',
                toolbar_text: isDarkMode ? '#f9f9fb' : '#15141a'
            }
        });
    }
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === "reportBug") {
    const webhookUrl = "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN";
    const payload = { content: `🐞 **Bug Report:**\n${message.text}` };

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) console.error("Discord error:", await res.text());
      return { success: res.ok };
    } catch (e) {
      console.error("Fetch failed:", e);
      return { success: false, error: e.message };
    }
  }
});