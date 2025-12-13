
import os
import base64

icons_dir = r"c:\Users\25692\yierfuMiniprogram\test1for1\images\icons"
wxss_path = r"c:\Users\25692\yierfuMiniprogram\test1for1\pages\client\remote\remote.wxss"

css_output = []
css_output.append("\n/* Generated Icon Styles */")
css_output.append(".iconfont {")
css_output.append("  display: inline-block;")
css_output.append("  width: 1em;")
css_output.append("  height: 1em;")
css_output.append("  background-color: currentColor;")
css_output.append("  -webkit-mask-repeat: no-repeat;")
css_output.append("  -webkit-mask-position: center;")
css_output.append("  -webkit-mask-size: contain;")
css_output.append("}")

for filename in os.listdir(icons_dir):
    if filename.endswith(".svg"):
        name = os.path.splitext(filename)[0]
        with open(os.path.join(icons_dir, filename), "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
            data_uri = f"data:image/svg+xml;base64,{b64}"
            
            css_output.append(f".icon-{name} {{")
            css_output.append(f"  -webkit-mask-image: url('{data_uri}');")
            css_output.append("}")

with open(wxss_path, "a", encoding="utf-8") as f:
    f.write("\n".join(css_output))
