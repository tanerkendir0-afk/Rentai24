#!/usr/bin/env python3
"""Generate App Store screenshots for RentAI 24"""

from PIL import Image, ImageDraw, ImageFont
import os

# App Store screenshot sizes
SIZES = {
    "6.5": (1284, 2778),
    "5.5": (1242, 2208),
}

# Colors
BG = (15, 23, 42)          # #0f172a
CARD = (30, 41, 59)        # #1e293b
BORDER = (51, 65, 85)      # #334155
PRIMARY = (59, 130, 246)   # #3b82f6
TEXT = (248, 250, 252)     # #f8fafc
MUTED = (148, 163, 184)    # #94a3b8
GREEN = (34, 197, 94)      # #22c55e
PINK = (236, 72, 153)      # #ec4899
AMBER = (245, 158, 11)     # #f59e0b
PURPLE = (139, 92, 246)    # #8b5cf6
CYAN = (6, 182, 212)       # #06b6d4
INDIGO = (99, 102, 241)    # #6366f1
ORANGE = (249, 115, 22)    # #f97316
TEAL = (20, 184, 166)      # #14b8a6
WHITE = (255, 255, 255)

OUT_DIR = "/home/user/Rentai24/screenshots"
ICON_PATH = "/home/user/Rentai24/mobile/assets/icon.png"


def get_font(size):
    """Get a font, fallback to default"""
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def get_font_regular(size):
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def rounded_rect(draw, xy, fill, radius=20, outline=None):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)


def draw_status_bar(draw, w, y_offset=0):
    """Draw iOS-like status bar"""
    font = get_font(28)
    draw.text((60, 18 + y_offset), "19:14", fill=WHITE, font=font)
    # Notch area indicator
    draw.rounded_rectangle((w//2 - 80, 10 + y_offset, w//2 + 80, 45 + y_offset), radius=20, fill=(30, 30, 30))
    # Battery
    draw.rounded_rectangle((w - 120, 20 + y_offset, w - 60, 42 + y_offset), radius=4, fill=GREEN)
    font_sm = get_font(22)
    draw.text((w - 180, 18 + y_offset), "LTE", fill=WHITE, font=font_sm)


def draw_tab_bar(draw, w, h, active_tab=0):
    """Draw bottom tab bar"""
    tab_h = 100
    y = h - tab_h
    draw.rectangle((0, y, w, h), fill=(10, 18, 35))
    draw.line((0, y, w, y), fill=BORDER, width=1)

    tabs = ["Chat", "Dashboard", "AI Workers", "Settings"]
    tab_icons = ["💬", "📊", "🤖", "⚙️"]
    tab_w = w // len(tabs)
    font = get_font_regular(22)

    for i, (name, icon) in enumerate(zip(tabs, tab_icons)):
        cx = tab_w * i + tab_w // 2
        color = PRIMARY if i == active_tab else MUTED
        # Tab icon circle
        draw.ellipse((cx - 16, y + 15, cx + 16, y + 47), fill=color if i == active_tab else None, outline=color, width=2)
        # Tab label
        bbox = draw.textbbox((0, 0), name, font=font)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, y + 55), name, fill=color, font=font)


def screenshot_1_welcome(w, h):
    """Welcome/Marketing screenshot"""
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    # Load and place icon
    try:
        icon = Image.open(ICON_PATH).convert("RGBA")
        icon_size = 260
        icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
        x_pos = (w - icon_size) // 2
        img.paste(icon, (x_pos, 350), icon)
    except:
        draw.ellipse((w//2 - 130, 350, w//2 + 130, 610), fill=PRIMARY)

    font_title = get_font(72)
    font_sub = get_font(38)
    font_desc = get_font_regular(32)

    # Title
    title = "RentAI 24"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, 660), title, fill=WHITE, font=font_title)

    # Tagline
    tagline = "Rent AI, 24/7"
    bbox = draw.textbbox((0, 0), tagline, font=font_sub)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, 760), tagline, fill=PRIMARY, font=font_sub)

    # Description
    desc_lines = [
        "Pre-trained AI agents",
        "ready to join your team today.",
    ]
    y = 860
    for line in desc_lines:
        bbox = draw.textbbox((0, 0), line, font=font_desc)
        tw = bbox[2] - bbox[0]
        draw.text(((w - tw) // 2, y), line, fill=MUTED, font=font_desc)
        y += 50

    # Feature cards
    features = [
        ("💬", "24/7 Customer Support", "AI that never sleeps", PRIMARY),
        ("📈", "Sales Development", "Boost your pipeline", GREEN),
        ("📱", "Social Media Manager", "Content on autopilot", PINK),
        ("📊", "Data Analysis", "Insights in seconds", INDIGO),
    ]

    card_w = w - 120
    card_h = 130
    y = 1080
    for icon_emoji, title, desc, color in features:
        rounded_rect(draw, (60, y, 60 + card_w, y + card_h), fill=CARD, radius=24, outline=BORDER)
        # Color accent bar
        draw.rounded_rectangle((60, y, 72, y + card_h), radius=4, fill=color)
        # Icon circle
        draw.ellipse((100, y + 25, 160, y + 85), fill=(*color, ), outline=None)
        font_ico = get_font(32)
        draw.text((115, y + 40), icon_emoji, font=font_ico)
        # Text
        font_card_title = get_font(30)
        font_card_desc = get_font_regular(24)
        draw.text((180, y + 30), title, fill=WHITE, font=font_card_title)
        draw.text((180, y + 72), desc, fill=MUTED, font=font_card_desc)
        y += card_h + 20

    # Bottom CTA
    btn_w = 500
    btn_h = 80
    bx = (w - btn_w) // 2
    by = h - 300
    draw.rounded_rectangle((bx, by, bx + btn_w, by + btn_h), radius=40, fill=PRIMARY)
    font_btn = get_font(32)
    btn_text = "Get Started Free"
    bbox = draw.textbbox((0, 0), btn_text, font=font_btn)
    btw = bbox[2] - bbox[0]
    draw.text(((w - btw) // 2, by + 22), btn_text, fill=WHITE, font=font_btn)

    return img


def screenshot_2_chat(w, h):
    """Chat interface screenshot"""
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, w)

    # Header
    font_header = get_font(42)
    draw.text((40, 70), "Chat", fill=WHITE, font=font_header)

    # Agent selector pills
    agents = [
        ("Customer Support", PRIMARY, True),
        ("Sales SDR", GREEN, False),
        ("Social Media", PINK, False),
    ]
    x = 40
    y_pills = 140
    font_pill = get_font(22)
    for name, color, active in agents:
        bbox = draw.textbbox((0, 0), name, font=font_pill)
        pw = bbox[2] - bbox[0] + 40
        ph = 50
        if active:
            draw.rounded_rectangle((x, y_pills, x + pw, y_pills + ph), radius=25, fill=(*color[:3],), outline=None)
            draw.text((x + 20, y_pills + 13), name, fill=WHITE, font=font_pill)
        else:
            draw.rounded_rectangle((x, y_pills, x + pw, y_pills + ph), radius=25, fill=CARD, outline=BORDER)
            draw.text((x + 20, y_pills + 13), name, fill=MUTED, font=font_pill)
        x += pw + 15

    # Chat messages
    messages = [
        ("user", "Hello! I need help with a customer complaint about shipping delays."),
        ("ai", "I'd be happy to help! Let me draft a professional response for you. Here's what I suggest:\n\n\"Dear Customer,\n\nThank you for reaching out. We sincerely apologize for the delay in your shipment. We understand how frustrating this can be...\""),
        ("user", "That looks great! Can you make it more empathetic?"),
        ("ai", "Of course! Here's an updated version with more empathy:\n\n\"Dear valued customer,\n\nI completely understand your frustration, and I want you to know that your experience matters deeply to us...\""),
    ]

    y = 220
    font_msg = get_font_regular(26)
    max_msg_w = w - 200

    for sender, text in messages:
        # Wrap text
        words = text.split()
        lines = []
        current = ""
        for word in words:
            test = current + " " + word if current else word
            bbox = draw.textbbox((0, 0), test, font=font_msg)
            if bbox[2] - bbox[0] > max_msg_w - 40:
                if current:
                    lines.append(current)
                current = word
            else:
                current = test
        if current:
            lines.append(current)

        # Limit lines for display
        lines = lines[:6]
        if len(text) > 150:
            lines = lines[:4]
            lines.append("...")

        msg_h = len(lines) * 36 + 24
        msg_w = max_msg_w

        if sender == "user":
            x = w - msg_w - 40
            draw.rounded_rectangle((x, y, x + msg_w, y + msg_h), radius=20, fill=PRIMARY)
            for i, line in enumerate(lines):
                draw.text((x + 20, y + 12 + i * 36), line, fill=WHITE, font=font_msg)
        else:
            x = 40
            draw.rounded_rectangle((x, y, x + msg_w, y + msg_h), radius=20, fill=CARD, outline=BORDER)
            for i, line in enumerate(lines):
                draw.text((x + 20, y + 12 + i * 36), line, fill=TEXT, font=font_msg)

        y += msg_h + 16
        if y > h - 300:
            break

    # Input bar
    input_y = h - 180
    draw.rounded_rectangle((30, input_y, w - 30, input_y + 70), radius=35, fill=CARD, outline=BORDER)
    font_placeholder = get_font_regular(24)
    draw.text((80, input_y + 22), "Type a message...", fill=MUTED, font=font_placeholder)
    # Send button
    draw.ellipse((w - 100, input_y + 8, w - 46, input_y + 62), fill=PRIMARY)

    draw_tab_bar(draw, w, h, active_tab=0)
    return img


def screenshot_3_agents(w, h):
    """AI Workers catalog screenshot"""
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, w)

    font_header = get_font(42)
    font_sub = get_font_regular(26)
    draw.text((40, 70), "AI Workers", fill=WHITE, font=font_header)
    draw.text((40, 125), "Hire pre-trained AI agents for your team", fill=MUTED, font=font_sub)

    # Category pills
    cats = [("All", True), ("Support", False), ("Sales", False), ("Marketing", False), ("Finance", False)]
    x = 40
    y_cat = 185
    font_cat = get_font(22)
    for name, active in cats:
        bbox = draw.textbbox((0, 0), name, font=font_cat)
        pw = bbox[2] - bbox[0] + 36
        ph = 44
        if active:
            draw.rounded_rectangle((x, y_cat, x + pw, y_cat + ph), radius=22, fill=PRIMARY)
            draw.text((x + 18, y_cat + 10), name, fill=WHITE, font=font_cat)
        else:
            draw.rounded_rectangle((x, y_cat, x + pw, y_cat + ph), radius=22, fill=CARD, outline=BORDER)
            draw.text((x + 18, y_cat + 10), name, fill=MUTED, font=font_cat)
        x += pw + 12

    # Agent cards
    agents = [
        ("Customer Support Agent", "24/7 customer support with human-like responses", "From $300/mo", PRIMARY, "Most Popular", "7 languages"),
        ("Sales Development Rep", "Automate outreach and qualify leads", "From $300/mo", GREEN, "High ROI", "5 languages"),
        ("Social Media Manager", "Create & schedule content across platforms", "From $250/mo", PINK, None, "6 languages"),
        ("Bookkeeping Assistant", "Automated invoicing & expense tracking", "From $200/mo", AMBER, None, "4 languages"),
        ("Scheduling Agent", "Smart appointment management", "From $150/mo", PURPLE, None, "5 languages"),
        ("HR/Recruiting Assistant", "Streamline hiring & onboarding", "From $300/mo", CYAN, None, "6 languages"),
    ]

    y = 260
    card_w = w - 80
    card_h = 160

    font_name = get_font(28)
    font_desc = get_font_regular(22)
    font_price = get_font(22)
    font_tag = get_font(18)
    font_lang = get_font_regular(18)

    for name, desc, price, color, tag, langs in agents:
        if y + card_h > h - 130:
            break

        rounded_rect(draw, (40, y, 40 + card_w, y + card_h), fill=CARD, radius=20, outline=BORDER)

        # Color icon circle
        draw.ellipse((65, y + 30, 125, y + 90), fill=color)

        # Agent name
        draw.text((145, y + 25), name, fill=WHITE, font=font_name)

        # Tag badge
        if tag:
            bbox_name = draw.textbbox((0, 0), name, font=font_name)
            tag_x = 145 + bbox_name[2] - bbox_name[0] + 15
            bbox_tag = draw.textbbox((0, 0), tag, font=font_tag)
            tag_w = bbox_tag[2] - bbox_tag[0] + 16
            if tag_x + tag_w < 40 + card_w - 20:
                draw.rounded_rectangle((tag_x, y + 28, tag_x + tag_w, y + 52), radius=10, fill=(*color, ))
                draw.text((tag_x + 8, y + 30), tag, fill=WHITE, font=font_tag)

        # Description
        draw.text((145, y + 65), desc[:50], fill=MUTED, font=font_desc)

        # Price
        draw.text((145, y + 105), price, fill=PRIMARY, font=font_price)

        # Languages
        bbox_price = draw.textbbox((0, 0), price, font=font_price)
        lang_x = 145 + bbox_price[2] - bbox_price[0] + 30
        draw.text((lang_x, y + 107), f"🌐 {langs}", fill=MUTED, font=font_lang)

        # Chevron
        draw.text((40 + card_w - 50, y + 60), "›", fill=MUTED, font=get_font(40))

        y += card_h + 16

    draw_tab_bar(draw, w, h, active_tab=2)
    return img


def screenshot_4_dashboard(w, h):
    """Dashboard screenshot"""
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, w)

    font_header = get_font(42)
    font_welcome = get_font(34)
    font_name = get_font(38)

    draw.text((40, 70), "Dashboard", fill=WHITE, font=font_header)
    draw.text((40, 140), "Welcome back!", fill=MUTED, font=font_welcome)
    draw.text((40, 185), "Taner", fill=WHITE, font=font_name)

    # Stats cards
    stats = [
        ("Active Agents", "4", PRIMARY),
        ("Messages Used", "1,247", GREEN),
    ]
    card_w = (w - 100) // 2
    card_h = 150
    for i, (label, value, color) in enumerate(stats):
        x = 40 + i * (card_w + 20)
        y = 270
        rounded_rect(draw, (x, y, x + card_w, y + card_h), fill=CARD, radius=20, outline=BORDER)
        # Color top accent
        draw.rounded_rectangle((x, y, x + card_w, y + 6), radius=3, fill=color)
        font_stat_val = get_font(48)
        font_stat_label = get_font_regular(22)
        draw.text((x + 30, y + 35), value, fill=WHITE, font=font_stat_val)
        draw.text((x + 30, y + 100), label, fill=MUTED, font=font_stat_label)

    # Your AI Agents section
    y = 470
    font_section = get_font(32)
    draw.text((40, y), "Your AI Agents", fill=WHITE, font=font_section)

    agents = [
        ("Customer Support", "Active", PRIMARY, 78, 500),
        ("Sales SDR", "Active", GREEN, 45, 500),
        ("Social Media", "Active", PINK, 120, 300),
        ("Data Analyst", "Active", INDIGO, 23, 200),
    ]

    y = 530
    card_h = 140
    font_agent = get_font(26)
    font_detail = get_font_regular(20)
    font_pct = get_font(20)

    for name, status, color, used, total in agents:
        if y + card_h > h - 130:
            break
        rounded_rect(draw, (40, y, w - 40, y + card_h), fill=CARD, radius=20, outline=BORDER)

        # Color circle
        draw.ellipse((65, y + 20, 115, y + 70), fill=color)

        # Name
        draw.text((135, y + 20), name, fill=WHITE, font=font_agent)

        # Status badge
        bbox_n = draw.textbbox((0, 0), name, font=font_agent)
        sx = 135 + bbox_n[2] - bbox_n[0] + 15
        draw.rounded_rectangle((sx, y + 22, sx + 80, y + 48), radius=12, fill=(34, 197, 94, 50))
        font_status = get_font(16)
        draw.text((sx + 10, y + 27), status, fill=GREEN, font=font_status)

        # Progress bar
        bar_x = 135
        bar_y = y + 75
        bar_w = w - 220
        bar_h = 14
        pct = used / total
        draw.rounded_rectangle((bar_x, bar_y, bar_x + bar_w, bar_y + bar_h), radius=7, fill=BORDER)
        fill_w = int(bar_w * pct)
        if fill_w > 0:
            draw.rounded_rectangle((bar_x, bar_y, bar_x + fill_w, bar_y + bar_h), radius=7, fill=color)

        # Usage text
        usage_text = f"{used} / {total} messages"
        pct_text = f"{int(pct * 100)}%"
        draw.text((bar_x, bar_y + 22), usage_text, fill=MUTED, font=font_detail)
        bbox_pct = draw.textbbox((0, 0), pct_text, font=font_pct)
        draw.text((bar_x + bar_w - bbox_pct[2] + bbox_pct[0], bar_y + 22), pct_text, fill=color, font=font_pct)

        y += card_h + 16

    draw_tab_bar(draw, w, h, active_tab=1)
    return img


def screenshot_5_agent_detail(w, h):
    """Agent detail screenshot"""
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, w)

    # Back button
    font_back = get_font(28)
    draw.text((40, 70), "‹ Back", fill=PRIMARY, font=font_back)

    # Hero section with color bg
    hero_color = (59, 130, 246, 25)
    draw.rounded_rectangle((0, 120, w, 420), radius=0, fill=(20, 30, 55))

    # Large icon
    draw.ellipse((w//2 - 70, 160, w//2 + 70, 300), fill=PRIMARY)

    font_name = get_font(42)
    font_role = get_font_regular(28)
    font_price = get_font(30)

    name = "Customer Support Agent"
    bbox = draw.textbbox((0, 0), name, font=font_name)
    draw.text(((w - bbox[2] + bbox[0]) // 2, 320), name, fill=WHITE, font=font_name)

    role = "24/7 Multilingual Customer Support"
    bbox = draw.textbbox((0, 0), role, font=font_role)
    draw.text(((w - bbox[2] + bbox[0]) // 2, 375), role, fill=MUTED, font=font_role)

    # Price
    price = "From $300/mo"
    bbox = draw.textbbox((0, 0), price, font=font_price)
    draw.text(((w - bbox[2] + bbox[0]) // 2, 440), price, fill=PRIMARY, font=font_price)

    # Description
    y = 510
    font_section = get_font(28)
    font_body = get_font_regular(24)

    draw.text((40, y), "About", fill=WHITE, font=font_section)
    y += 45
    desc_lines = [
        "Handles customer inquiries with natural,",
        "empathetic responses. Supports 7 languages",
        "and integrates with your existing tools.",
    ]
    for line in desc_lines:
        draw.text((40, y), line, fill=MUTED, font=font_body)
        y += 36

    # Skills section
    y += 30
    draw.text((40, y), "Skills", fill=WHITE, font=font_section)
    y += 45
    skills = ["Email Support", "Live Chat", "Ticket Mgmt", "FAQ", "Escalation", "Analytics"]
    x = 40
    font_skill = get_font(20)
    for skill in skills:
        bbox = draw.textbbox((0, 0), skill, font=font_skill)
        sw = bbox[2] - bbox[0] + 24
        sh = 40
        if x + sw > w - 40:
            x = 40
            y += sh + 10
        draw.rounded_rectangle((x, y, x + sw, y + sh), radius=20, fill=(59, 130, 246, 40))
        # Approximate the semi-transparent blue
        draw.rounded_rectangle((x, y, x + sw, y + sh), radius=20, fill=(25, 40, 70), outline=PRIMARY)
        draw.text((x + 12, y + 8), skill, fill=PRIMARY, font=font_skill)
        x += sw + 10

    # Integrations
    y += 70
    draw.text((40, y), "Integrations", fill=WHITE, font=font_section)
    y += 45
    integrations = ["WhatsApp", "Zendesk", "Intercom", "Slack", "Instagram", "Freshdesk"]
    x = 40
    for integ in integrations:
        bbox = draw.textbbox((0, 0), integ, font=font_skill)
        iw = bbox[2] - bbox[0] + 24
        ih = 40
        if x + iw > w - 40:
            x = 40
            y += ih + 10
        draw.rounded_rectangle((x, y, x + iw, y + ih), radius=20, fill=CARD, outline=BORDER)
        draw.text((x + 12, y + 8), integ, fill=TEXT, font=font_skill)
        x += iw + 10

    # CTA Button
    btn_w = w - 80
    btn_h = 70
    btn_y = h - 180
    draw.rounded_rectangle((40, btn_y, 40 + btn_w, btn_y + btn_h), radius=35, fill=PRIMARY)
    font_btn = get_font(30)
    btn_text = "Start Chatting"
    bbox = draw.textbbox((0, 0), btn_text, font=font_btn)
    draw.text(((w - bbox[2] + bbox[0]) // 2, btn_y + 18), btn_text, fill=WHITE, font=font_btn)

    return img


def screenshot_6_settings(w, h):
    """Settings screenshot"""
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, w)

    font_header = get_font(42)
    draw.text((40, 70), "Settings", fill=WHITE, font=font_header)

    # User profile card
    y = 150
    rounded_rect(draw, (40, y, w - 40, y + 120), fill=CARD, radius=20, outline=BORDER)
    # Avatar circle
    draw.ellipse((65, y + 20, 145, y + 100), fill=PRIMARY)
    font_initial = get_font(40)
    draw.text((90, y + 35), "T", fill=WHITE, font=font_initial)
    font_name = get_font(30)
    font_email = get_font_regular(22)
    draw.text((170, y + 28), "Taner Kendir", fill=WHITE, font=font_name)
    draw.text((170, y + 70), "taner@rentai24.com", fill=MUTED, font=font_email)

    # Account section
    y = 310
    font_section = get_font(24)
    draw.text((55, y), "ACCOUNT", fill=MUTED, font=font_section)

    items_account = [
        ("👤", "Profile", PRIMARY),
        ("🔒", "Security", PRIMARY),
        ("🌐", "Language", PRIMARY),
    ]

    y += 45
    card_h = len(items_account) * 65 + 10
    rounded_rect(draw, (40, y, w - 40, y + card_h), fill=CARD, radius=20, outline=BORDER)

    font_item = get_font_regular(28)
    for i, (icon, label, color) in enumerate(items_account):
        iy = y + 15 + i * 65
        draw.text((70, iy + 5), icon, font=get_font(28))
        draw.text((120, iy + 8), label, fill=WHITE, font=font_item)
        draw.text((w - 90, iy + 5), "›", fill=MUTED, font=get_font(32))
        if i < len(items_account) - 1:
            draw.line((120, iy + 60, w - 60, iy + 60), fill=BORDER, width=1)

    # App section
    y += card_h + 30
    draw.text((55, y), "APP", fill=MUTED, font=font_section)

    items_app = [
        ("💳", "Subscription", PRIMARY),
        ("🔔", "Notifications", PRIMARY),
    ]

    y += 45
    card_h = len(items_app) * 65 + 10
    rounded_rect(draw, (40, y, w - 40, y + card_h), fill=CARD, radius=20, outline=BORDER)

    for i, (icon, label, color) in enumerate(items_app):
        iy = y + 15 + i * 65
        draw.text((70, iy + 5), icon, font=get_font(28))
        draw.text((120, iy + 8), label, fill=WHITE, font=font_item)
        draw.text((w - 90, iy + 5), "›", fill=MUTED, font=get_font(32))
        if i < len(items_app) - 1:
            draw.line((120, iy + 60, w - 60, iy + 60), fill=BORDER, width=1)

    # Sign out
    y += card_h + 30
    rounded_rect(draw, (40, y, w - 40, y + 75), fill=CARD, radius=20, outline=BORDER)
    draw.text((70, y + 18), "🚪", font=get_font(28))
    font_signout = get_font_regular(28)
    draw.text((120, y + 22), "Sign Out", fill=(239, 68, 68), font=font_signout)

    # Version
    y += 120
    ver = "RentAI 24 v1.0.0"
    bbox = draw.textbbox((0, 0), ver, font=get_font_regular(20))
    draw.text(((w - bbox[2] + bbox[0]) // 2, y), ver, fill=MUTED, font=get_font_regular(20))

    draw_tab_bar(draw, w, h, active_tab=3)
    return img


def generate_all():
    screenshots = [
        ("01_welcome", screenshot_1_welcome),
        ("02_chat", screenshot_2_chat),
        ("03_agents", screenshot_3_agents),
        ("04_dashboard", screenshot_4_dashboard),
        ("05_agent_detail", screenshot_5_agent_detail),
        ("06_settings", screenshot_6_settings),
    ]

    for size_name, (w, h) in SIZES.items():
        for name, func in screenshots:
            img = func(w, h)
            path = os.path.join(OUT_DIR, f"{name}_{size_name}in.png")
            img.save(path, "PNG", quality=95)
            print(f"Created: {path}")


if __name__ == "__main__":
    generate_all()
    print("\nAll screenshots generated!")
