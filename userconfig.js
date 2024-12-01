let saved_config = JSON.parse(localStorage.getItem("CONFIG"));

const default_config = {
  overrideStorage: true,
  temperature: {
    location: "Tokyo, Japan",
    scale: "C",
  },
  clock: {
    format: "h:i p",
    iconColor: "#ea6962",
  },
  search: {
    engines: {
      b: ["https://www.bing.com/search?q=", "Bing"],
      d: ["https://duckduckgo.com/html?q=", "DuckDuckGo"],
      g: ["https://google.com/search?q=", "Google"],
      p: ["https://www.perplexity.ai/search/new?q=", "Perplexity AI"],
      pin: ["https://www.pinterest.es/search/pins/?q=", "Pinterest"],
      r: ["https://www.reddit.com/search/?q=", "Reddit"],
      y: ["https://youtube.com/results?search_query=", "Youtube"],
    },
  },
  keybindings: {
    s: "search-bar",
    q: "config-tab",
  },
  disabled: [],
  localIcons: false,
  fastlink: "https://chatgpt.com/",
  openLastVisitedTab: true,
  tabs: [
    {
      name: "chi ll",
      background_url: "src/img/banners/cbg-2.gif",
      categories: [
        {
          name: "Social Media",
          links: [
            {
              name: "",
              url: "https://bsky.app/",
              icon: "brand-bluesky",
              icon_color: "#89A8B2",
            },
            {
              name: "",
              url: "https://discord.com/app/",
              icon: "brand-discord-filled",
              icon_color: "#CDC1FF",
            },
            {
              name: "",
              url: "https://www.facebook.com/",
              icon: "brand-facebook",
              icon_color: "#C6E7FF",
            },
            {
              name: "",
              url: "https://www.instagram.com/",
              icon: "brand-instagram",
              icon_color: "#cb9df0",
            },
            {
              name: "",
              url: "https://www.reddit.com/",
              icon: "brand-reddit",
              icon_color: "#e78a4e",
            },
            {
              name: "",
              url: "https://web.whatsapp.com/",
              icon: "brand-whatsapp",
              icon_color: "#a9b665",
            },
            {
              name: "",
              url: "https://x.com/home",
              icon: "brand-x",
              icon_color: "#ffffff",
            },
          ],
        },
        {
          name: "Music",
          links: [
            {
              name: "deezer",
              url: "https://www.deezer.com/en/",
              icon: "brand-deezer",
              icon_color: "#FFB38E",
            },
            {
              name: "spotify",
              url: "https://open.spotify.com/",
              icon: "brand-spotify",
              icon_color: "#b1c29e",
            },
            {
              name: "music",
              url: "https://music.youtube.com/",
              icon: "brand-youtube",
              icon_color: "#FF8A8A",
            },
          ],
        },
        {
          name: "Video",
          links: [
            {
              name: "kick",
              url: "https://www.kick.com/",
              icon: "brand-kick",
              icon_color: "#D0E8C5",
            },
            {
              name: "rumble",
              url: "https://www.rumble.com/",
              icon: "brand-rumble",
              icon_color: "#B1C29E",
            },
            {
              name: "twitch",
              url: "https://www.twitch.tv/",
              icon: "brand-twitch",
              icon_color: "#d3869b",
            },
            {
              name: "youtube",
              url: "https://www.youtube.com/",
              icon: "brand-youtube-filled",
              icon_color: "#ea6962",
            },
          ],
        },
      ],
    },
    {
      name: "design",
      background_url: "src/img/banners/cbg-6.gif",
      categories: [
        {
          name: "inspiration",
          links: [
            {
              name: "pinterest",
              url: "https://www.pinterest.es/",
              icon: "brand-pinterest",
              icon_color: "#ea6962",
            },
            {
              name: "artstation",
              url: "https://www.artstation.com/?sort_by=community",
              icon: "chart-area",
              icon_color: "#7daea3",
            },
            {
              name: "leonardo ai",
              url: "https://app.leonardo.ai/",
              icon: "brand-openai",
              icon_color: "#89b482",
            },
            {
              name: "dribble",
              url: "https://dribbble.com/following",
              icon: "brand-dribbble-filled",
              icon_color: "#d3869b",
            },
          ],
        },
        {
          name: "resources",
          links: [
            {
              name: "figma",
              url: "https://www.figma.com",
              icon: "brand-figma",
              icon_color: "#d3869b",
            },
            {
              name: "uxpro",
              url: "https://uxpro.cc/",
              icon: "components",
              icon_color: "#a9b665",
            },
            {
              name: "colorhunt",
              url: "https://colorhunt.co/",
              icon: "color-picker",
              icon_color: "#ea6962",
            },
            {
              name: "adobe color",
              url: "https://color.adobe.com/es/create/color-wheel",
              icon: "brand-adobe",
              icon_color: "#7daea3",
            },
            {
              name: "terminalsexy",
              url: "https://terminal.sexy",
              icon: "prompt",
              icon_color: "#e78a4e",
            },
          ],
        },
        {
          name: "resources 3d",
          links: [
            {
              name: "thingiverse",
              url: "https://www.thingiverse.com/",
              icon: "circle-letter-t",
              icon_color: "#7daea3",
            },
          ],
        },
      ],
    },
    {
      name: "dev",
      background_url: "src/img/banners/cbg-7.gif",
      categories: [
        {
          name: "repositories",
          links: [
            {
              name: "github",
              url: "https://github.com/",
              icon: "brand-github",
              icon_color: "#7daea3",
            },
            {
              name: "gitlab",
              url: "https://gitlab.com/",
              icon: "brand-gitlab",
              icon_color: "#e78a4e",
            },
          ],
        },
        {
          name: "resources",
          links: [
            {
              name: "phind",
              url: "https://www.phind.com/",
              icon: "brand-openai",
              icon_color: "#89b482",
            },
            {
              name: "flutter",
              url: "https://docs.flutter.dev/ui",
              icon: "brand-flutter",
              icon_color: "#7daea3",
            },
            {
              name: "hacktricks",
              url: "https://book.hacktricks.xyz/welcome/readme",
              icon: "biohazard",
              icon_color: "#ea6962",
            },
            {
              name: "vscode",
              url: "https://vscode.dev/",
              icon: "brand-vscode",
              icon_color: "#7daea3",
            },
          ],
        },
        {
          name: "challenges",
          links: [
            {
              name: "hackthebox",
              url: "https://app.hackthebox.com",
              icon: "box",
              icon_color: "#a9b665",
            },
            {
              name: "cryptohack",
              url: "https://cryptohack.org/challenges/",
              icon: "brain",
              icon_color: "#e78a4e",
            },
            {
              name: "tryhackme",
              url: "https://tryhackme.com/dashboard",
              icon: "brand-onedrive",
              icon_color: "#ea6962",
            },
            {
              name: "hackerrank",
              url: "https://www.hackerrank.com/dashboard",
              icon: "code-asterix",
              icon_color: "#a9b665",
            },
          ],
        },
      ],
    },
    {
      name: "myself",
      background_url: "src/img/banners/cbg-9.gif",
      categories: [
        {
          name: "mails",
          links: [
            {
              name: "gmail",
              url: "https://mail.google.com/mail/u/0/",
              icon: "brand-gmail",
              icon_color: "#ea6962",
            },
          ],
        },
        {
          name: "storage",
          links: [
            {
              name: "drive",
              url: "https://drive.google.com/drive/my-drive",
              icon: "brand-google-drive",
              icon_color: "#e78a4e",
            },
            {
              name: "dropbox",
              url: "https://www.dropbox.com/home",
              icon: "box-seam",
              icon_color: "#7daea3",
            },
            {
              name: "mega",
              url: "https://mega.nz/",
              icon: "circle-letter-m-filled",
              icon_color: "#ea6962",
            },
            {
              name: "onedrive",
              url: "https://onedrive.live.com/",
              icon: "brand-onedrive",
              icon_color: "#789DBC",
            },
            {
              name: "photos",
              url: "https://photos.google.com/",
              icon: "brand-google-photos",
              icon_color: "#C9E9D2",
            },
          ],
        },
        {
          name: "stuff",
          links: [
            {
              name: "linkedin",
              url: "https://www.linkedin.com/feed/",
              icon: "brand-linkedin",
              icon_color: "#7daea3",
            },
          ],
        },
      ],
    },
  ],
};

const CONFIG = new Config(saved_config ?? default_config);
// const CONFIG = new Config(default_config);

(function () {
  var css = document.createElement("link");
  css.href = "src/css/tabler-icons.min.css";
  css.rel = "stylesheet";
  css.type = "text/css";
  if (!CONFIG.config.localIcons)
    document.getElementsByTagName("head")[0].appendChild(css);
})();
