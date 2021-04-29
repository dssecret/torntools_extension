"use strict";

(async () => {
	const feature = featureManager.registerFeature(
		"Happy Gains beside Candy",
		"items",
		() => settings.pages.items.candyHappyGains,
		initialiseAddGains,
		addGains,
		removeGains,
		{
			storage: ["settings.pages.items.candyHappyGains"],
		},
		async () => {
			await requireElement("[data-category='Candy']");
		}
	);

	function initialiseAddGains() {
		CUSTOM_LISTENERS[EVENT_CHANNELS.ITEM_SWITCH_TAB].push(() => {
			if (feature.enabled()) addGains();
		});
	}

	function addGains() {
		const facCandyPerc = parseInt(
			userdata.faction_perks
				.filter((x) => /candy/i.test(x))
				.map((x) => {
					x.replace(/\D+/g, "");
				})[0]
		);
		const jobCandyPerc = parseInt(
			userdata.company_perks
				.filter((x) => /boost/i.test(x))
				.map((x) => {
					x.replace(/\D+/g, "");
				})[0]
		);
		document.findAll("[data-category='Candy']").forEach((candy) => {
			if (!candy.find(".tt-candy-gains")) {
				const baseHappy = parseInt(
					torndata.items[candy.dataset.item].effect
						.split(" ")
						.map((x) => parseInt(x))
						.filter((x) => !isNaN(x))[0]
				);
				let totalHappy = baseHappy;
				if (!isNaN(facCandyPerc)) totalHappy += (facCandyPerc / 100) * baseHappy;
				if (!isNaN(jobCandyPerc)) totalHappy += (jobCandyPerc / 100) * baseHappy;
				const rawHTML = `<span class="tt-candy-gains">${totalHappy}H</span>`;
				candy.find(".name-wrap .qty.bold.t-hide").insertAdjacentHTML("beforeEnd", rawHTML);
			}
		});
	}

	function removeGains() {
		document.findAll(".tt-candy-gains").forEach((x) => x.remove());
	}
})();
