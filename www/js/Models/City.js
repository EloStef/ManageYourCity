function City() {
    this.houses = [];
    this.buildings = [];
    this.people = [];
    this.player = new Player();
    this.resources = new Resources(10000, 2000, 0);
    this.widthheight = [25, 60];
    this.amountOfDeadPeople = 0;
    this.lastArrivalNewPeopleTime = new Date().getTime();
    this.arrivalNewPeopleStamp = 2 * timeStamp;

    this.lastGetMoneyTime = new Date().getTime();
    this.getMoneyStamp = 12 * timeStamp;
}

City.prototype = {
    init: function() {
        window.setInterval(this.update.bind(this), 500);
        window.setInterval(this.geoLocate.bind(this), 200);
    },
    update: function() {
        this.arrivalNewPeople();
        this.getMoney();
        this.updateBuildings();
        this.updatePeople();
        reload();
    },
    geoLocate: function(){
        navigator.geolocation.getCurrentPosition(this.successGeoLocate.bind(this), this.errorGeoLocate.bind(this));
    },
    successGeoLocate: function(pos){
        setNavigation(true, "img/navigationButtonOn.png");
        localStorage.setItem(lastPlayerPosKey, JSON.stringify([pos.coords.latitude, pos.coords.longitude]));
        if(start){
            this.player.move([pos.coords.latitude, pos.coords.longitude], 0);
            start = false;
        }else{
            this.player.move([pos.coords.latitude, pos.coords.longitude], 2100);
        }
    },
    errorGeoLocate: function(error){
        setNavigation(false, "img/navigationButtonOff.png");
    },
    buildBuilding: function(name) {
        var cost = BuildingController.getCost(name);
        if (!cost.isEnough(this.resources))
            return false;
        if (this.isBuildingClose(this.player.coordinates))
            return false;
        this.resources.addRemove(-cost.gold, -cost.wood, -cost.food);
        console.log(this.player.coordinates);
        if (name == "House") {
            var building = new House(this.houses.length + this.buildings.length,
                this.player.coordinates);
            this.houses.push(building);
        } else {
            var building;
            if (name === "Sawmill")
                building = new Sawmill(this.houses.length + this.buildings.length,
                    this.player.coordinates);
            if (name === "Mill")
                building = new Mill(this.houses.length + this.buildings.length,
                    this.player.coordinates);
            if (name === "Church")
                building = new Church(this.houses.length + this.buildings.length,
                    this.player.coordinates);
            if (name === "City Hall")
                building = new Settlement(this.houses.length + this.buildings.length,
                    this.player.coordinates);
            this.buildings.push(building);
        }
        reload();
    },
    takeUpgradeBuildingCost: function(cost) {
        if (!cost.isEnough(this.resources))
            return false;
        this.resources.addRemove(-cost.gold, -cost.wood, -cost.food);
        return true;
    },
    updateHouses: function() {

    },
    updateBuildings: function() {
        for (i in this.buildings) {
            this.buildings[i].update();
        }
    },
    updatePeople: function() {
        for (i in this.people) {
            this.people[i].update();
        }
    },
    getDailyProfit: function() {
        this.resources.addRemove(this.people.length * 30, 0, 0);
    },
    arrivalNewPeople: function() {
        if (this.amountFreePlacesInHouses() > 0) {
            if (this.people.length < 2) {
                this.createNewPerson();
            } else {
                if (this.lastArrivalNewPeopleTime + this.arrivalNewPeopleStamp < new Date().getTime()) {
                    if (Math.floor(Math.random() * 100) <= this.getAveragePeopleHealth()) {
                        this.createNewPerson();
                    }
                    this.lastArrivalNewPeopleTimes += this.arrivalNewPeopleStamp;
                }
            }
        }
    },
    getAveragePeopleHealth: function() {
        var averageHealth = 0;
        if(this.people.length == 0)
            return 100;
        for (i in this.people) {
            averageHealth += this.people[i].getHealth();
        }
        if (this.people.length <= 0)
            return " - ";
        return Math.round(averageHealth / this.people.length);
    },
    createNewPerson: function() {
        var housesWithFreePlaceIds = [];
        for (i in this.houses) {
            if (this.houses[i].getPeopleAmount() > 0)
                housesWithFreePlaceIds.push(i);
        }
        var sex = ["Male", "Female"];
        var houseI = housesWithFreePlaceIds[Math.floor(Math.random() * housesWithFreePlaceIds.length)];
        var newPerson = new Person(
            this.people.length + this.amountOfDeadPeople + 1,
            sex[Math.floor(Math.random() * 1)],
            this.houses[houseI].id,
            this.getAveragePeopleHealth());
        this.houses[houseI].addPerson(newPerson.id);
        this.people.push(newPerson);
    },
    killPerson: function(id) {
        for(i in this.people){
            if(this.people[i].id == id){
                this.people.splice(i, 1);
                this.amountOfDeadPeople += 1;
                return true;
            }
        }
        return false;
    },
    amountFreePlacesInHouses: function() {
        var amount = 0;
        for (i in this.houses)
            amount += this.houses[i].getPeopleAmount();
        return amount;
    },
    findJobFor: function(id) {
        var buildingWithPlacesToWorkIds = [];
        for (i in this.buildings) {
            if (this.buildings[i].getPeopleAmount() > 0)
                buildingWithPlacesToWorkIds.push(i);
        }

        if (buildingWithPlacesToWorkIds.length <= 0)
            return;

        var buildingI = buildingWithPlacesToWorkIds[Math.floor(Math.random() * buildingWithPlacesToWorkIds.length)];
        this.getPerson(id).hiredIn = this.buildings[buildingI].id;
        this.buildings[buildingI].addPerson(id);
    },
    isBuildingClose: function(coordinates) {
        for (i in this.houses)
            if (this.isInRange(coordinates, this.houses[i].coordinates, range))
                return true;
        for (i in this.buildings)
            if (this.isInRange(coordinates, this.buildings[i].coordinates, range))
                return true;
        return false;
    },
    anyChurchInRange: function(houseId) {
        var coordinates = this.getBuilding(houseId).coordinates;
        if(coordinates == null)
            return false;
        for (i in this.buildings)
            if (this.buildings[i].name == "Church") {
                if (this.isInRange(coordinates, this.buildings[i].coordinates, range + this.buildings[i].people.length * rangePerPerson))
                    return true;
            }
        return false;
    },
    isInRange: function(coord1, coord2, _range) {
        if(this.distance(coord1[0],coord1[1],coord2[0],coord2[1],"K") * 1000 <= _range)
            return true;
        return false;
    },
    distance: function(lat1, lon1, lat2, lon2, unit) {
        var radlat1 = Math.PI * lat1 / 180
        var radlat2 = Math.PI * lat2 / 180
        var theta = lon1 - lon2
        var radtheta = Math.PI * theta / 180
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist)
        dist = dist * 180 / Math.PI
        dist = dist * 60 * 1.1515
        if (unit == "K") { dist = dist * 1.609344 }
        if (unit == "N") { dist = dist * 0.8684 }
        return dist
    },
    getMoney: function() {
        if (this.lastGetMoneyTime + this.getMoneyStamp < new Date().getTime()) {
            this.resources.addRemove(this.people.length * 25, 0, 0);
            this.lastGetMoneyTime += this.getMoneyStamp;
        }
    },
    getPerson: function(id) {
        for (i in this.people)
            if (this.people[i].id == id)
                return this.people[i];
        return null;
    },
    getBuilding: function(id) {
        for (i in this.houses)
            if (this.houses[i].id == id)
                return this.houses[i];
        for (i in this.buildings)
            if (this.buildings[i].id == id)
                return this.buildings[i];
        return null;
    },
    getBuildingWherePlayerIs: function() {
        for (i in this.houses)
            if (this.houses[i].coordinates[0] == this.player.coordinates[0] &&
                this.houses[i].coordinates[1] == this.player.coordinates[1])
                return this.houses[i];
        for (i in this.buildings)
            if (this.buildings[i].coordinates[0] == this.player.coordinates[0] &&
                this.buildings[i].coordinates[1] == this.player.coordinates[1])
                return this.buildings[i];
        return null;
    },
    getWorkersAmount: function() {
        var workers = {};
        workers["Sawmill"] = 0;
        workers["Mill"] = 0;
        workers["Church"] = 0;
        workers["City Hall"] = 0;
        for (i in this.buildings){
            workers[this.buildings[i].name] += this.buildings[i].people.length;
        }
        var workersAmount = 0;
        for (key in workers){
            workersAmount += workers[key];
        }
        workers["Unemployed"] = this.people.length - workersAmount;
        return workers;
    },
    getMap: function() {
        var map = new Array(this.widthheight[0]);
        for (x = 0; x < map.length; x++) {
            map[x] = new Array(this.widthheight[1]);
        }
        for (x = 0; x < map.length; x++) {
            for (y = 0; y < map[0].length; y++) {
                map[x][y] = '.';
            }
        }

        for (i in this.houses)
            map[this.houses[i].coordinates[1]][this.houses[i].coordinates[0]] = 'H';

        for (i in this.buildings) {
            var char_ = this.buildings[i].name[0];
            if (this.buildings[i].name == "Settlement")
                char_ = 'O';
            map[this.buildings[i].coordinates[1]][this.buildings[i].coordinates[0]] = char_;
        }

        map[this.player.coordinates[1]][this.player.coordinates[0]] = 'P';

        var mapstring = "";
        for (x = 0; x < map.length; x++) {
            for (y = 0; y < map[0].length; y++) {
                mapstring += map[x][y];
            }
            mapstring += "\n";
        }
        return mapstring;
    }
}
