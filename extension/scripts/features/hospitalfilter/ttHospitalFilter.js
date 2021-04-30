"use strict";

(async () => {
	featureManager.registerFeature(
		"Hospital Filter",
		"hospital",
		() => settings.pages.hospital.filter,
		null,
		addFilterAndFilter,
		removeFilters,
		{
			storage: ["settings.pages.hospital.filter"],
		},
		async () => {
			await requireElement(".userlist-wrapper.hospital-list-wrapper .users-list .time");
		}
	);

	function addFilterAndFilter() {
		const { content } = createContainer("Hospital Filter", {
			nextElement: document.find(".users-list-title"),
		});
		content.innerHTML = `
			<div class="filter-header">
				<div class="statistic" id="showing">Showing <span class="filter-count">X</span> of <span class="filter-total">50</span> users</div>
			</div>
			<div class="filter-content">
				<div class="filter-wrap" id="activity-filter">
					<div class="filter-heading">Activity</div>
					<div class="filter-multi-wrap">
						<div class="tt-checkbox-wrap">
							<input type="checkbox" value="online" id="tt-hospital-filter-online">
							<label for="tt-hospital-filter-online">Online</label>
						</div>
						<div class="tt-checkbox-wrap">
							<input type="checkbox" value="idle" id="tt-hospital-filter-idle">
							<label for="tt-hospital-filter-idle">Idle</label>
						</div>
						<div class="tt-checkbox-wrap">
							<input type="checkbox" value="offline" id="tt-hospital-filter-offline">
							<label for="tt-hospital-filter-offline">Offline</label>
						</div>
					</div>
				</div>
				<div class="filter-wrap">
					<div class="filter-heading">Revives</div>
					<div class="filter-multi-wrap">
						<div class="tt-checkbox-wrap">
							<input type="checkbox" value="revives-enabled" id="tt-hospital-filter-revivable">
							<label for="tt-hospital-filter-revivable">Enabled</label>
						</div>
					</div>
				</div>
				<div class="filter-wrap">
					<div class="filter-heading">Faction</div>
					<select name="faction" id="tt-faction-filter">
						<option selected value="">none</option>
						<option disabled value="------">------</option>
					</select>
				</div>
			</div>
		`;
		const timeFilter = document.newElement({
			type: "div",
			class: "filter-wrap",
			id: "time-filter",
			children: [
				newSlider(),
				document.newElement({
					type: "div",
					class: "time-filter-info-wrap",
					children: [document.newElement({ type: "span", class: "time-filter-info" })],
				}),
			],
		});
		const levelFilter = document.newElement({
			type: "div",
			class: "filter-wrap",
			id: "level-filter",
			children: [
				newSlider(),
				document.newElement({
					type: "div",
					class: "level-filter-info-wrap",
					children: [document.newElement({ type: "span", class: "level-filter-info" })],
				}),
			],
		});
		content.find(".filter-content").appendChild(timeFilter);
		content.find(".filter-content").appendChild(levelFilter);

		// Set up the filters
		for (const activity of filters.hospital.activity) {
			content.find(`#activity-filter [value="${activity}"]`).checked = true;
		}
		if (filters.hospital.revivesOn) content.find("#tt-hospital-filter-revivable").checked = true;
		// There is no faction filter setup
		timeFilter.find(".handle.left").dataset.value = filters.hospital.timeStart;
		timeFilter.find(".handle.right").dataset.value = filters.hospital.timeEnd;
		timeFilter.find(".tt-dual-range").style.setProperty("--x-1", (filters.hospital.timeStart * 150) / 100 - 13 + "px");
		timeFilter.find(".tt-dual-range").style.setProperty("--x-2", (filters.hospital.timeEnd * 150) / 100 - 13 + "px");
		levelFilter.find(".handle.left").dataset.value = filters.hospital.levelStart;
		levelFilter.find(".handle.right").dataset.value = filters.hospital.levelEnd;
		levelFilter.find(".tt-dual-range").style.setProperty("--x-1", (filters.hospital.levelStart * 150) / 100 - 13 + "px");
		levelFilter.find(".tt-dual-range").style.setProperty("--x-2", (filters.hospital.levelEnd * 150) / 100 - 13 + "px");

		// Listeners
		content.findAll("input[type='checkbox']").forEach((x) => x.addEventListener("click", filtering));
		content.find("#tt-faction-filter").addEventListener("input", filtering);
		content.findAll(".handle.left, .handle.right").forEach((x) => new MutationObserver(filtering).observe(x, { attributes: true }));

		addFactionsToList();
		filtering();

		async function filtering() {
			// Get the set filters
			let activity = [];
			for (const checkbox of content.findAll("#activity-filter input:checked")) {
				activity.push(checkbox.getAttribute("value"));
			}
			const revivesOn = content.find("#tt-hospital-filter-revivable").checked;
			const faction = content.find("#tt-faction-filter").value;
			const timeStart = parseInt(timeFilter.find(".handle.left").dataset.value);
			const timeEnd = parseInt(timeFilter.find(".handle.right").dataset.value);
			const levelStart = parseInt(levelFilter.find(".handle.left").dataset.value);
			const levelEnd = parseInt(levelFilter.find(".handle.right").dataset.value);
			// Update level and time slider counters
			content.find(".level-filter-info").innerText = `Level ${levelStart} - ${levelEnd}`;
			content.find(".time-filter-info").innerText = `Time ${timeStart}h - ${timeEnd}h`;
			// Save filters
			await ttStorage.change({
				filters: {
					hospital: {
						timeStart: timeStart,
						timeEnd: timeEnd,
						levelStart: levelStart,
						levelEnd: levelEnd,
						faction: faction,
						activity: activity,
						revivesOn: revivesOn,
					},
				},
			});
			// Actual Filtering
			for (const li of document.findAll(".users-list > li")) {
				// Activity
				if (
					activity.length &&
					!activity.some(
						(x) =>
							x.trim() ===
							li
								.find("#iconTray li")
								.getAttribute("title")
								.replace(/^<b>/g, "")
								.replace(/<\/b>$/g, "")
								.toLowerCase()
								.trim()
					)
				) {
					showRow(li, false);
					continue;
				}
				// Revives On
				if (revivesOn && li.find(".revive").classList.contains("reviveNotAvailable")) {
					showRow(li, false);
					continue;
				}

				// Faction
				const rowFaction = li.find(".user.faction");
				if (
					faction &&
					((rowFaction.childElementCount === 0 && rowFaction.innerText.trim() !== faction.trim()) ||
						(rowFaction.childElementCount !== 0 &&
							rowFaction.find("img") &&
							rowFaction.find("img").getAttribute("title").trim() !== faction.trim()))
				) {
					showRow(li, false);
					continue;
				}
				// Time
				const timeLeftHrs = li.find(".info-wrap .time").lastChild.textContent.trim().split(" ")[0].replace(/[hs]/g, "");
				if ((timeStart && timeLeftHrs < timeStart) || (timeEnd !== 100 && timeLeftHrs > timeEnd)) {
					showRow(li, false);
					continue;
				}
				// Level
				const level = parseInt(li.find(".info-wrap .level").innerText.replace(/\D+/g, ""));
				if ((levelStart && level < levelStart) || (levelEnd !== 100 && level > levelEnd)) {
					showRow(li, false);
					continue;
				}
				showRow(li);
			}

			function showRow(li, show = true) {
				if (!li.classList) return;
				if (show) li.classList.remove("hidden");
				else li.classList.add("hidden");
			}
			updateStat();
		}

		function addFactionsToList() {
			const rows = [...document.findAll(".users-list > li .user.faction")];
			const factions = new Set(
				rows[0].find("img")
					? rows
							.map((row) => row.find("img"))
							.filter((img) => !!img)
							.map((img) => img.getAttribute("title").trim())
							.filter((tag) => !!tag)
					: rows.map((row) => row.innerText.trim()).filter((tag) => !!tag)
			);

			for (const fac of factions) {
				content.find("#tt-faction-filter").appendChild(document.newElement({ type: "option", value: fac, text: fac }));
			}
		}

		function updateStat() {
			content.find(".filter-count").innerText = document.findAll(".users-list > li:not(.hidden)").length;
		}
	}
	function removeFilters() {
		removeContainer("Hospital Filter");
		document.findAll(".users-list > li.hidden").forEach((x) => x.classList.remove("hidden"));
	}
})();