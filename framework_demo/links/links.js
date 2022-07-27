class DirectLinks {
	set link(env)   { this.env = env};
	get mainPage()  { return this.env};
	get services()  { return "https://s.onliner.by/tasks"};
	get baraholka() { return "https://baraholka.onliner.by/"};
        get forum()     { return "https://forum.onliner.by/"};
	get kurs()      { return "https://kurs.onliner.by/"}
}

module.exports = {DirectLinks: DirectLinks};
