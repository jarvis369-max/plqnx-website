#!/usr/bin/env python3
from pathlib import Path
import sys
root=Path(sys.argv[1])
pkg=root/"app/src/main/java/com/plqnx/notes"
def edit(file, fn):
    p=root/file
    a=p.read_text()
    b=fn(a)
    if a==b: print("No changes:",file)
    p.write_text(b)

def main(s):
    s=s.replace('private static final int[] COLORS={0xFF8175BF,0xFF75A48B,0xFFCE9B85,0xFFB79B72,0xFF7F9FBE};',
                'private static final int[] COLORS={0xFF50E5F5,0xFFFFBE72,0xFF70AFFF,0xFF87EBC7,0xFFA5DDF0};')
    s=s.replace('private boolean light=true, zenMode=false, previewMode=false;','private boolean light=false, zenMode=false, previewMode=false;')
    s=s.replace('light=true; // Calm, soft-light appearance only.','light=false; // High-contrast workspace.')
    s=s.replace('light=true;bg=0xFFFBFAF7;card=0xFFFFFFFF;surface=0xFFF2F0F8;\n        raised=0xFFE8EAF0;fg=0xFF2D3B40;muted=0xFF78838B;stroke=0xFFE3E6EB;\n        accent=COLORS[accentIndex];secondary=0xFF766EA7;',
        'light=false;bg=0xFF07121E;card=0xFF102438;surface=0xFF142E43;\n        raised=0xFF1C3A50;fg=0xFFF0FAFF;muted=0xFFAAC6D5;stroke=0xFF30536A;\n        accent=COLORS[accentIndex];secondary=0xFF89A8BB;')
    s=s.replace('View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR','0')
    s=s.replace('View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR','0')
    s=s.replace('bars.setSystemBarsAppearance(lightBars,lightBars);','bars.setSystemBarsAppearance(0,lightBars);')
    s=s.replace('bars.setSystemBarsAppearance(appearance,appearance);','bars.setSystemBarsAppearance(0,appearance);')
    s=s.replace('c.setSystemBarsAppearance(appearance,appearance);','c.setSystemBarsAppearance(0,appearance);')
    s=s.replace('getWindow().getDecorView().setSystemUiVisibility(flags);','getWindow().getDecorView().setSystemUiVisibility(0);')
    s=s.replace('root.addView(new LivingPaper(this,preferences),new FrameLayout.LayoutParams(-1,-1));',
                'root.addView(new LivingPaper(this,preferences),new FrameLayout.LayoutParams(-1,-1));')
    s=s.replace('root.addView(new SignatureViews.FlowPaper(this,preferences,true),new FrameLayout.LayoutParams(-1,-1));','')
    s=s.replace('final int ink=0xFF172039, purple=0xFF7C47F7, grey=0xFF81849B;',
                'final int ink=0xFFF0FAFF, purple=0xFF50E5F5, grey=0xFFAAC6D5;')
    s=s.replace('titleEditor.setHintTextColor(0xFF9896AF);','titleEditor.setHintTextColor(0xFF91ADBD);')
    s=s.replace('bodyEditor.setTextColor(ink);bodyEditor.setHintTextColor(0xFF9492A9);',
                'bodyEditor.setTextColor(ink);bodyEditor.setHintTextColor(0xFF91ADBD);')
    s=s.replace('LinearLayout form=col();form.setPadding(dp(20),dp(10),dp(20),dp(20));\n        scroller.addView(form,new ScrollView.LayoutParams(-1,-2));',
                'scroller.setPadding(dp(13),dp(8),dp(13),dp(8));\n        LinearLayout form=col();form.setPadding(dp(18),dp(16),dp(18),dp(20));\n        form.setBackground(glass(0xF40E2436,0xF40B1E2E,21));\n        scroller.addView(form,new ScrollView.LayoutParams(-1,-2));')
    s=s.replace('folderLabel=tap("⌑  "+editorNote.folder,11,purple,0xDFFFFFFF,16,this::chooseFolder);',
                'folderLabel=tap("⌑  "+editorNote.folder,11,purple,surface,16,this::chooseFolder);')
    s=s.replace('reminderLabel=tap("◷  "+formatTime(editorNote.reminder),11,purple,0xDFFFFFFF,16,this::pickReminder);',
                'reminderLabel=tap("◷  "+formatTime(editorNote.reminder),11,purple,surface,16,this::pickReminder);')
    s=s.replace('0xE9FFFFFF,15,this::convertChecklist','surface,15,this::convertChecklist')
    s=s.replace('0xDFFFFFFF,16,()->{addCheckItem("",false);scheduleDraft();}','surface,16,()->{addCheckItem("",false);scheduleDraft();}')
    s=s.replace('TextView foot=text("Private and saved on this device  ·  Plqnx notes",11,0xFF9691A5,false);',
                'TextView foot=text("Saved locally  ·  Plqnx notes",11,muted,false);')
    s=s.replace('dock.setBackground(SignatureViews.gradient(this,0xF9FFFFFF,0xEBFFF9FF,25));',
                'dock.setBackground(glass(0xF9133044,0xF9102233,22));')
    s=s.replace('LinearLayout tools=row();tools.setGravity(Gravity.CENTER_VERTICAL);\n        dock.addView(tools,new FrameLayout.LayoutParams(-1,-1));',
                'HorizontalScrollView toolScroll=new HorizontalScrollView(this);toolScroll.setHorizontalScrollBarEnabled(false);\n        toolScroll.setFillViewport(true);dock.addView(toolScroll,new FrameLayout.LayoutParams(-1,-1));\n        LinearLayout tools=row();tools.setGravity(Gravity.CENTER_VERTICAL);\n        toolScroll.addView(tools,new HorizontalScrollView.LayoutParams(-2,-1));')
    s=s.replace('area.setBackground(SignatureViews.fill(this,0x44FFFFFF,18));','area.setBackground(outlined(surface,14));')
    s=s.replace('new SignatureViews.Glyph(this,type,0xFF182239)','new SignatureViews.Glyph(this,type,accent)')
    s=s.replace('if(icon.equals("plus"))area.setBackground(SignatureViews.gradient(this,0xFF6B74BF,0xFF5351AD,24));\n        else area.setBackground(SignatureViews.fill(this,0x88FFFFFF,22));',
                'if(icon.equals("plus"))area.setBackground(gradient(0xFF50E5F5,0xFF70AFFF,18));\n        else area.setBackground(outlined(surface,18));')
    s=s.replace('new SignatureViews.Glyph(this,icon,icon.equals("plus")?Color.WHITE:0xFF232743)',
                'new SignatureViews.Glyph(this,icon,icon.equals("plus")?bg:fg)')
    s=s.replace('LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(48),1);p.leftMargin=dp(2);p.rightMargin=dp(2);',
                'LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(dp(48),dp(48));p.leftMargin=dp(3);p.rightMargin=dp(3);')
    s=s.replace('item.setBackground(glass(light?0xFFFFFFFF:0xFF171B2D,0xFFFCFCFA,20));',
                'item.setBackground(glass(card,0xFF0B1E2E,20));')
    s=s.replace('item.setBackground(glass(card,0xFFFBFAF7,18));',
                'item.setBackground(glass(card,0xFF0B1E2E,18));')
    s=s.replace('LinearLayout r=row();parent.addView(r,lp(-1,28,0,14,0,8));',
                'LinearLayout r=row();r.setMinimumHeight(dp(28));parent.addView(r,lp(-1,-2,0,14,0,8));')
    s=s.replace('LinearLayout brand=row();content.addView(brand,lp(-1,48,0,0,0,0));',
                'LinearLayout brand=row();brand.setMinimumHeight(dp(56));content.addView(brand,lp(-1,-2,0,0,0,0));')
    s=s.replace('LinearLayout content=col();content.setPadding(dp(20),dp(18),dp(20),dp(95));',
                'LinearLayout content=col();content.setPadding(dp(16),dp(14),dp(16),dp(95));')
    s=s.replace('TextView action=tap("+  Write your first note",12,0xFF111122,accent,14',
                'TextView action=tap("+  Write your first note",12,bg,accent,14')
    s=s.replace('TextView chip=tap(filterName,12,filter.equals(filterName)?0xFF10101D:muted,',
                'TextView chip=tap(filterName,12,filter.equals(filterName)?bg:muted,')
    s=s.replace('TextView create=tap("＋",29,0xFF11111F,accent,22,',
                'TextView create=tap("＋",29,bg,accent,22,')
    s=s.replace('String[] names={"Lavender","Sage","Peach","Sand","Blue"};',
                'String[] names={"Cyan","Amber","Blue","Mint","Ice"};')
    s=s.replace('String[] names={"Lavender","Sage","Peach","Sand","Sky"};',
                'String[] names={"Cyan","Amber","Blue","Mint","Ice"};')
    s=s.replace('settingCard("☼","Soft light appearance","Gentle ivory, sage and lavender tones",()->toast("Soft light mode is always on"));',
                'settingCard("☼","PLQNX interface","High-contrast typography and readable controls",()->toast("Designed for clarity"));')
    s=s.replace('settingCard("✦","Accent color","Lavender · Sage · Peach · Sand · Sky",()->{',
                'settingCard("✦","Accent color","Cyan · Amber · Blue · Mint · Ice",()->{')
    s=s.replace('LinearLayout item=row();item.setBackground(outlined(card,17));item.setPadding(dp(15),dp(13),dp(15),dp(13));',
                'LinearLayout item=row();item.setBackground(glass(card,0xFF0E2132,17));item.setPadding(dp(13),dp(13),dp(13),dp(13));')
    s=s.replace('TextView ico=text(icon,23,accent,true);ico.setGravity(Gravity.CENTER);item.addView(ico,lp(41,48,0,0,8,0));',
                'FrameLayout ico=new FrameLayout(this);ico.setBackground(outlined(surface,13));\n        ico.addView(new SignatureViews.Glyph(this,"sparkle",accent),SignatureViews.fp(this,23,23,Gravity.CENTER,0,0,0,0));\n        item.addView(ico,lp(44,44,0,0,10,0));')
    s=s.replace('copy.addView(text(heading,15,fg,true));copy.addView(text(description,11,muted,false),lp(-1,-2,0,4,0,0));',
                'TextView title=text(heading,15,fg,true);title.setMaxLines(3);copy.addView(title);\n        TextView hint=text(description,12,muted,false);hint.setMaxLines(6);\n        copy.addView(hint,lp(-1,-2,0,4,0,0));')
    s=s.replace('TextView monogram=tap("P",22,0xFF10111F,accent,15,',
                'TextView monogram=tap("P",22,bg,accent,15,')
    s=s.replace('monogram.setBackground(glass(light?0xFFCBB3FF:0xFFAD91FF,light?0xFF9DD8F4:0xFF6B7BD6,15));',
                'monogram.setBackground(gradient(0xFF50E5F5,0xFF70AFFF,15));')
    return s

def home(s):
    s=s.replace('private static final int PURPLE=0xFF7C47F7, INK=0xFF19223A, MUTED=0xFF6B7184;',
                'private static final int PURPLE=0xFF50E5F5, INK=0xFFF0FAFF, MUTED=0xFFAAC6D5;')
    s=s.replace('private static final int[] CARD_COLORS={0xFFFFF4E9,0xFFF7EFFF,0xFFEAF7E8,0xFFF4ECFD,0xFFFFEDF4,0xFFEEF3FF};',
                'private static final int[] CARD_COLORS={0xFF13344B,0xFF11283E,0xFF143B44,0xFF112E42,0xFF1B3043,0xFF102E3D};')
    s=s.replace('0x55FFFFFF','0xFF142B3D').replace('0xC6FFFFFF','0xFF142B3D').replace('0xEDFFFFFF','0xFF142B3D').replace('0xDDFFFFFF','0xFF11273A')
    s=s.replace('0xFFF076E9,0xFF8756F4','0xFF50E5F5,0xFF70AFFF')
    s=s.replace('0xFFE568EF,0xFF7B47F9','0xFF50E5F5,0xFF70AFFF')
    s=s.replace('0xFFDB70F4,0xFF7B4AF4','0xFF50E5F5,0xFF70AFFF')
    s=s.replace('0xFF101020','0xFFF0FAFF').replace('0xFF161627','0xFFAAC6D5')
    s=s.replace('0xFF4E5568','0xFFAAC6D5').replace('0xFFE46542','0xFFFFBE72')
    s=s.replace('0xFF50576C','0xFF9EBDD0').replace('0xFF546078','0xFF9EBDD0')
    s=s.replace('0xFFDFD4F1','0xFF18354B')
    s=s.replace('if(!name.equals("All")){','if(!name.equals("All")){')
    s=s.replace('root.addView(new SignatureViews.FlowPaper(host,prefs,false),new FrameLayout.LayoutParams(-1,-1));',
                'root.addView(new SignatureViews.FlowPaper(host,prefs,false),new FrameLayout.LayoutParams(-1,-1));')
    s=s.replace('shell.addView(header,lp(-1,62,0,0,0,0));',
                'header.setMinimumHeight(d(62));shell.addView(header,lp(-1,-2,0,0,0,0));')
    s=s.replace('shell.addView(hs,lp(-1,58,0,0,0,0));',
                'hs.setMinimumHeight(d(58));shell.addView(hs,lp(-1,-2,0,0,0,0));')
    s=s.replace('LinearLayout.LayoutParams cp=lp(-2,39,0,0,9,0);',
                'LinearLayout.LayoutParams cp=lp(-2,-2,0,0,9,0);')
    s=s.replace('chip.setMinHeight(d(39));','chip.setMinHeight(d(43));')
    s=s.replace('nav.setBackground(SignatureViews.gradient(host,0xF9FFFFFF,0xFFF4ECFB,26));',
                'nav.setBackground(SignatureViews.gradient(host,0xF9133044,0xFA081C2D,22));')
    s=s.replace('shell.addView(nav,lp(-1,82,0,0,0,0));',
                'nav.setMinimumHeight(d(90));shell.addView(nav,lp(-1,-2,9,0,9,8));')
    s=s.replace('nav.addView(strip,SignatureViews.fp(host,-1,-1,Gravity.FILL,8,3,8,2));',
                'nav.addView(strip,SignatureViews.fp(host,-1,90,Gravity.CENTER,8,3,8,2));')
    s=s.replace('nav.addView(fab,SignatureViews.fp(host,58,58,Gravity.TOP|Gravity.CENTER_HORIZONTAL,0,-25,0,0));',
                'nav.addView(fab,SignatureViews.fp(host,58,58,Gravity.CENTER,0,0,0,0));')
    s=s.replace('new SignatureViews.Glyph(host,"plus",Color.WHITE)',
                'new SignatureViews.Glyph(host,"plus",0xFF07121E)')
    s=s.replace('LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,-1,1));',
                'LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,-1,1));')
    s=s.replace('TextView label=t(title,10,selected?INK:0xFF50576C,selected);',
                'TextView label=t(title,11,selected?PURPLE:0xFFAAC6D5,selected);label.setMaxLines(2);')
    s=s.replace('new LinearLayout.LayoutParams(0,-1,1.0f)',
                'new LinearLayout.LayoutParams(0,-1,1.12f)')
    s=s.replace('int max=Math.min(notes.size(),120);for(int i=0;i<max;i++)noteCard(i%2==0?left:right,notes.get(i),start+i);',
                'int max=Math.min(notes.size(),120);float width=host.getResources().getDisplayMetrics().widthPixels/host.getResources().getDisplayMetrics().density;\n        if(width<390||host.getResources().getConfiguration().fontScale>1.15f){grid.removeAllViews();for(int i=0;i<max;i++)noteCard(grid,notes.get(i),start+i);}\n        else for(int i=0;i<max;i++)noteCard(i%2==0?left:right,notes.get(i),start+i);')
    # One-column cards are added to a VERTICAL wrapper rather than the original horizontal grid.
    s=s.replace('if(width<390||host.getResources().getConfiguration().fontScale>1.15f){grid.removeAllViews();for(int i=0;i<max;i++)noteCard(grid,notes.get(i),start+i);}',
                'if(width<390||host.getResources().getConfiguration().fontScale>1.15f){grid.removeAllViews();grid.setOrientation(LinearLayout.VERTICAL);for(int i=0;i<max;i++)noteCard(grid,notes.get(i),start+i);}')
    s=s.replace('String text=note.body==null?"":note.body;','String text=note.body==null?"":note.body;')
    s=s.replace('        if(all.isEmpty() && selected.equals("All")){',
                '        statusPanel(contents,all);\n        if(all.isEmpty() && selected.equals("All")){')
    marker='    private void heading(LinearLayout parent,String text,String note){'
    add='''    private void statusPanel(LinearLayout parent,List<NotesDb.Note> all){
        LinearLayout panel=col();panel.setPadding(d(17),d(16),d(17),d(17));
        panel.setBackground(SignatureViews.gradient(host,0xFF13384C,0xFF0C2436,20));
        parent.addView(panel,lp(-1,-2,0,0,0,16));
        TextView micro=t("●   PLQNX  /  KNOWLEDGE CONSOLE",10,PURPLE,true);
        micro.setLetterSpacing(.12f);panel.addView(micro);
        TextView hero=t("Your ideas, in command.",22,INK,true);
        panel.addView(hero,lp(-1,-2,0,12,0,6));
        panel.addView(t("A focused space for everything worth remembering.",12,MUTED,false));
        int pins=0;for(NotesDb.Note n:all)if(n.pinned)pins++;
        LinearLayout stats=row();panel.addView(stats,lp(-1,-2,0,16,0,2));
        TextView count=t(all.size()+"  NOTES  •  "+pins+"  PINNED",11,0xFF87EBC7,true);
        stats.addView(count,new LinearLayout.LayoutParams(0,-2,1));
        TextView ready=t("LOCAL  •  READY",10,PURPLE,true);stats.addView(ready);
    }
'''
    if marker in s:s=s.replace(marker,add+marker)
    return s

def views(s):
    s=s.replace('public static final int INK=0xFF172139, MUTED=0xFF7D8194, PURPLE=0xFF7D47F7;',
                'public static final int INK=0xFFF0FAFF, MUTED=0xFFAAC6D5, PURPLE=0xFF50E5F5;')
    s=s.replace('new int[]{0xFFFCF8FF,0xFFFFFBFB,0xFFF7F2FF}:new int[]{0xFFFFF8FF,0xFFFFF6F5,0xFFF6F1FE}',
                'new int[]{0xFF07121E,0xFF0B2033,0xFF071320}:new int[]{0xFF07121E,0xFF0A2030,0xFF07111C}')
    s=s.replace('glow(c,w*.9f,h*.25f,w*.65f,0x66FFE0D8);','glow(c,w*.9f,h*.25f,w*.65f,0x3341CDE3);')
    s=s.replace('glow(c,w*.1f,h*.96f,w*.56f,0x77C9BFFF);','glow(c,w*.1f,h*.96f,w*.56f,0x2A3494BF);')
    s=s.replace('0x55F7B6C5','0x2554E1F1').replace('0x66EEBDDE','0x2250CCDF').replace('0x6678A3FF','0x2870AAFF').replace('0x55D8C8FF','0x224AAACD')
    s=s.replace('0x44FAD3E6','0x2248BBD9').replace('0x44DEDCFF','0x2045A6D7')
    s=s.replace('color&0x77FFFFFF','color&0x66FFFFFF')
    return s

def living(s):
    s=s.replace('canvas.drawColor(0xFFFCFBFF);','canvas.drawColor(0xFF07121E);')
    s=s.replace('0x55E1D5FF,0x23DED8FD,0x00E5DDFD','0x2646DFF5,0x160E607D,0x0007121E')
    s=s.replace('0x44FFDBD6,0x20FFE5DF,0x00FFECE9','0x2041A6DE,0x120D4D6F,0x0007121E')
    s=s.replace('0x33CFEEE1,0x1CDCF2E8,0x00E2F4E9','0x2231B5AD,0x110F4848,0x0007121E')
    s=s.replace('0x0F9B91E2,0x0DE3A6C1,0x0E8DCBBB','0x0F50C5DD,0x0D3DBCD4,0x0E2382AE')
    s=s.replace('0x2AAE91DB:0x2BA2D3BA','0x2A73DFF3:0x2B4B9DDE')
    return s

def motion(s):
    s=s.replace('setBackgroundColor(0xFFF5F2FB)','setBackgroundColor(0xFF07121E)')
    s=s.replace('wordmark.setTextColor(0xFF283A40)','wordmark.setTextColor(0xFFF0FAFF)')
    s=s.replace('tagline.setTextColor(0xFF857E9D)','tagline.setTextColor(0xFFAAC6D5)')
    s=s.replace('0x66B5A7EE,0x44B1E5D6,0x00F4F2FC','0x6630D7E9,0x3356A6D0,0x00050E19')
    return s

edit(Path("app/src/main/java/com/plqnx/notes/MainActivity.java"),main)
edit(Path("app/src/main/java/com/plqnx/notes/SignatureHome.java"),home)
edit(Path("app/src/main/java/com/plqnx/notes/SignatureViews.java"),views)
edit(Path("app/src/main/java/com/plqnx/notes/LivingPaper.java"),living)
edit(Path("app/src/main/java/com/plqnx/notes/MotionSystem.java"),motion)
def version(s):
    return s.replace('versionCode 11','versionCode 12').replace("versionName '8.0.0'","versionName '9.0.0'")
edit(Path("app/build.gradle"),version)
def style(s):
    return s.replace('Theme.Material.Light.NoActionBar','Theme.Material.NoActionBar').replace('name="android:windowLightStatusBar">true','name="android:windowLightStatusBar">false').replace('#FCFBFF','#07121E').replace('#8175BF','#50E5F5')
edit(Path("app/src/main/res/values/styles.xml"),style)
print("PLQNX console theme applied; package name and DB preserved.")
