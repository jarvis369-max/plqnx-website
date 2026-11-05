#!/usr/bin/env python3
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

mode, file_name = sys.argv[1:3]
root = ET.parse(file_name).getroot()
nodes = list(root.iter("node"))
for n in nodes:
    txt = n.attrib.get("text", "")
    desc = n.attrib.get("content-desc", "")
    if txt or desc:
        print("UI:", txt[:80], "|", desc[:80], "|", n.attrib.get("bounds", ""))

if mode == "tap":
    match = [n for n in nodes if "Write something" in n.attrib.get("text", "") or
             "Write something" in n.attrib.get("content-desc", "")]
    assert match, "Write something button not found on compact phone"
    bounds = [int(x) for x in re.findall(r"\d+", match[0].attrib["bounds"])]
    x = (bounds[0] + bounds[2]) // 2
    y = (bounds[1] + bounds[3]) // 2
    print("TAPPING:", x, y)
    subprocess.check_call(["adb", "shell", "input", "tap", str(x), str(y)])
elif mode == "verify":
    txt = " ".join(n.attrib.get("text","")+" "+n.attrib.get("content-desc","") for n in nodes)
    assert "PHOTOS, SKETCHES" in txt or "Add photo" in txt, "Editor did not open after plus"
    print("EDITOR OPENED; MEDIA COMMANDS VISIBLE")
else:
    raise ValueError(mode)
