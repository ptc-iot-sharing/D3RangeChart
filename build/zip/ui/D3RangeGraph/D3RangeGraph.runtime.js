var D3RangeGraphFontsLoaded = false;
var YES = true;
var NO = false;

TW.Runtime.Widgets.D3RangeGraph = function () {

	var thisWidget = this;

	var labels;

	var timelineData, timelineXField, timelineYField;

	var interpolation = "linear";

	var timeFormat, numberFormat, axisFormat;

	var localeDefinition = {
	  "decimal": ".",
	  "thousands": ",",
	  "grouping": [3],
	  "currency": ["$", ""],
	  "dateTime": "%a %b %e %X %Y",
	  "date": "%m/%d/%Y",
	  "time": "%H:%M:%S",
	  "periods": ["AM", "PM"],
	  "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	  "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	  "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	  "shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	};

	var d3Locale;

	var missingValues;

	var circlesEnabled = NO;
	var circleSize = 100;

	var minimal;

	var timelineHeight = 48;

	var sharedYAxis = NO;
	var maxValue = -1;
	var minValue = -1;

	var timestampHover;

	var showsTimestamp, showsThresholds;

	var reflows = NO;
	var supportsDragToResize = NO;

	var chart = this;

	var snaps, showsSelector;

	var animationsEnabled;

	var xAxisStyle, yAxisStyle;

	var styleBlocks = [];
	var baseStyleBlock;

	/**
	 * Controls how long update animations should take.
	 */
	var animationDuration = 300;

	/**
	 * Will be set to true if the data was flipped
	 */
	var flipped = false;

	/**
	 * The secondary chart type. Must be none, timeline or barchart.
	 */
	var secondaryChartType = 'none'; // <String>
	
	/**
	 * When set to YES, the main chart and selector will be hidden.
	 */
	var secondaryChartOnly = NO; // <Boolean>

	/**
	 * How tall the bar chart should be.
	 */
	var barChartHeight;

	/**
	 * How the bars should be aligned.
	 */
	var barChartInterval;

	/**
	 * Distance that should be kept between the bar chart and selector & chart.
	 */
	var barChartPadding;
	
	/**
	 * Invoked by the runtime to get the base contents of the widget.
	 * @return <String>		The HTML content.
	 */
    this.renderHtml = function () {

        var html = '<div class="widget-content D3RangeGraph" style="overflow: hidden;">\
					</div>';
        return html;
    };
    
    /**
	 * Extracts the actual text size in pixels from the given Thingworx text size style attribute.
	 * @param textSize <String>		The Thingworx text size.
	 */
    function textSizeWithTWTextSize(textSize) {
		var textSize = TW.getTextSize(textSize);
		textSize = textSize.substring(textSize.indexOf(':') + 1, textSize.length - 1);
		return textSize;
    };

	/**
	 * Invoked by the runtime after the HTML content has been added to the page.
	 */
	this.afterRender = function() {

		if (!D3RangeGraphFontsLoaded) {
			D3RangeGraphFontsLoaded = true;
			$('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://fonts.googleapis.com/css?family=Open+Sans:400,700') );
		}

		baseStyleBlock = '.axis line,.axis path,.brush .extent,.overlayBorder{shape-rendering:crispEdges}svg{font:10px sans-serif}.area{fill:none;stroke:#000;stroke-width:2px;clip-path:url(#clip-' + chart.jqElementId + ')}.axis line,.axis path{fill:none;stroke:#999}.brush .extent{stroke:#000;stroke-opacity:.2;fill:#000;fill-opacity:.2}.tick>text{fill:#555}.domain{stroke:#999}.overlay{fill:none;pointer-events:all}.focus circle{fill:none;stroke:#4682b4}.overlayBorder{stroke:#000;stroke-opacity:.2;fill:#FFF}.D3RangeChartDragSelector{background:rgba(128,128,128,.5);border:1px solid #fff;box-shadow:0 0 1px 1px rgba(0,0,0,.1),0 4px 8px rgba(0,0,0,.1);border-radius:3px;pointer-events:none;position:absolute}';

		if (chart.getProperty('TimeFormatLocale')) {
			try {
				localeDefinition = JSON.parse(chart.getProperty('TimeFormatLocale'));
			}
			catch (e) {

			}
		}

		d3Locale = d3.locale(localeDefinition);

		legendAlignLeft = chart.getProperty('AlignLegendToLeft');

		showsSelector = this.getProperty('ShowsSelector');
		supportsDragToResize = this.getProperty('DragToZoom');

		minimal = this.getProperty("Minimal");

		secondaryChartType = this.getProperty('SecondaryChartType');
		
		secondaryChartOnly = !!(secondaryChartType && this.getProperty('SecondaryChartOnly'));
		
		// The selector is unavailable in secondary chart only mode
		if (secondaryChartOnly) showsSelector = NO;

		// Bar chart specific
		if (secondaryChartType == 'barchart') {
			barChartInterval = this.getProperty('BarChartIntervalSize');
			barChartXField = this.getProperty('BarChartXField');
			try {
				barChartYFields = JSON.parse(this.getProperty('BarChartYFields'));
			}
			catch (e) {
				alert('The bar chart Y fields were not configured correctly!');
			}

			// These properties are not required, so a blocking alert shouldn't signal they are incorrect
			try {
				barChartColors = JSON.parse(this.getProperty('BarChartColors'));
			}
			catch (e) {
				barChartColors = [];
			}

			try {
				barChartLabels = JSON.parse(this.getProperty('BarChartLabels'));
			}
			catch (e) {
				barChartLabels = [];
			}

			barChartStackMode = chart.getProperty('BarChartMultipleValuesDisplay');

			barChartMinYValue = chart.getProperty('BarChartMinYValue');
			if (barChartMinYValue == -1) barChartMinYValue = undefined;

			barChartMaxYValue = chart.getProperty('BarChartMaxYValue');
			if (barChartMaxYValue == -1) barChartMaxYValue = undefined;

			barChartPadding = chart.getProperty('BarChartPadding');

			barChartXAxisHeight = chart.getProperty('BarChartShowsXAxis') ? barChartXAxisHeight : 0;

		}
		else if (secondaryChartType == 'timeline') {
			timelineHeight = chart.getProperty('TimelineHeight');
			timelinePadding = chart.getProperty('TimelinePadding');
			timelineShowsXAxis = chart.getProperty('TimelineShowsXAxis');

			timelineXStartField = chart.getProperty("TimelineXField");
			timelineStateField = chart.getProperty("TimelineStateField");

			try {
				timelineColorMap = JSON.parse(chart.getProperty('TimelineColorMap'));
			}
			catch (e) {
				timelineColorMap = {};
			}
		}

		try {
		    thresholds = JSON.parse(this.getProperty('Thresholds'));
		}
		catch (e) {
		    console.log(e);
		    thresholds = undefined;
		}

		sharedYAxis = this.getProperty("SharedYAxis") || !!thresholds;
		minValue = this.getProperty("MinYValue");
		maxValue = this.getProperty("MaxYValue");

		rightMargin = this.getProperty('RightMargin');

		reflows = NO; //this.getProperty('ReflowsOnDataChange');

		snaps = this.getProperty('SnapsToPoints');

		timeFormat = this.getProperty('TimeFormat');
		numberFormat = this.getProperty('YFormat');
		axisFormat = chart.getProperty('YAxisFormat');

		animationsEnabled = this.getProperty('AnimationsEnabled');
		animationDuration = chart.getProperty('AnimationDuration');

		showsTimestamp = this.getProperty('ShowTimeOnHover');
		showsThresholds = this.getProperty('ShowThresholdsOnHover') && !!thresholds;

		missingValues = this.getProperty('MissingValues');

		xAxisStyle = this.getProperty('XAxisStyle') && TW.getStyleFromStyleDefinition(this.getProperty('XAxisStyle'));
		yAxisStyle = this.getProperty('YAxisStyle') && TW.getStyleFromStyleDefinition(this.getProperty('YAxisStyle'));
		backgroundStyle = this.getProperty('BackgroundStyle') && TW.getStyleFromStyleDefinition(this.getProperty('BackgroundStyle'));

		if (xAxisStyle) {
			var styleBlock = '<style>\n';

			if (xAxisStyle.foregroundColor) {
				styleBlock += '#' + this.jqElementId + ' .x text {fill: ' + xAxisStyle.foregroundColor + ';}\n';
			}

			if (xAxisStyle.textSize) {
				styleBlock += '#' + this.jqElementId + ' .x text {font-size: ' + textSizeWithTWTextSize(xAxisStyle.textSize) + ';}\n';
			}

			if (xAxisStyle.lineColor) {
				styleBlock += '#' + this.jqElementId + ' .x line, #' + this.jqElementId + ' .x .domain {stroke: ' + xAxisStyle.lineColor + ';}\n';
			}

			if (xAxisStyle.lineThickness) {
				styleBlock += '#' + this.jqElementId + ' .x line, #' + this.jqElementId + ' .x .domain {stroke-width: ' + xAxisStyle.lineThickness + ';}\n';
			}

			styleBlock += '\n</style>';

			this.jqElement.prepend(styleBlock);

			styleBlocks.push(styleBlock);
		}

		if (yAxisStyle) {
			var styleBlock = '<style>\n';

			if (yAxisStyle.foregroundColor) {
				styleBlock += '#' + this.jqElementId + ' .y text {fill: ' + yAxisStyle.foregroundColor + ';}\n';
			}

			if (yAxisStyle.textSize) {
				styleBlock += '#' + this.jqElementId + ' .y text {font-size: ' + textSizeWithTWTextSize(yAxisStyle.textSize) + ';}\n';
			}

			if (yAxisStyle.lineColor) {
				styleBlock += '#' + this.jqElementId + ' .y line, #' + this.jqElementId + ' .y .domain {stroke: ' + yAxisStyle.lineColor + ';}\n';
			}

			if (yAxisStyle.lineThickness) {
				styleBlock += '#' + this.jqElementId + ' .y line, #' + this.jqElementId + ' .y .domain {stroke-width: ' + yAxisStyle.lineThickness + ';}\n';
			}

			styleBlock += '\n</style>';

			styleBlocks.push(styleBlock);

			this.jqElement.prepend(styleBlock);
		}

		if (backgroundStyle) {
			if (backgroundStyle.backgroundColor) {
				var styleBlock = '<style>\n';
				styleBlock += '#' + this.jqElementId + '{background: ' + backgroundStyle.backgroundColor + '}';
				styleBlock += '\n</style>';

				styleBlocks.push(styleBlock);

				this.jqElement.prepend(styleBlock);
			}
		}

		this.showLegend = this.getProperty("ShowLegend");
		this.legendHeight = this.showLegend ? 24 + this.getProperty('TopMargin') : 0;

		this.fillAreas = this.getProperty("Fill");
		if (this.fillAreas) {
			this.fills = [];
			this.focusFills = [];
			this.fillOpacity = this.getProperty("FillOpacity");
		}

		circlesEnabled = this.getProperty('ShowDataPoints');
		if (circlesEnabled) {
			//this.circles = [];
			//this.circleSymbols = [];
			circleSize = this.getProperty('DataPointSize') || circleSize;
		}

		this.timelineHeight = 0;
		try {
			// The timeline must now be selected explicitly, rather than being opt-in from having any of its properties set
			this.hasTimeline = secondaryChartType == 'timeline';// this.getProperty("TimelineXField") && this.getProperty("TimelineStateField");
			if (!this.hasTimeline) {
				this.timelineHeight = 0;
			}
		}
		catch (e) {
			console.log(e.stack);
		}

		this.interpolation = this.getProperty("Interpolation");

		this.timelineXField = this.getProperty("TimelineXField");
		this.timelineYField = this.getProperty("TimelineStateField");

		this.defaultColors = ["#3F51B5", "#F44336", "#FFC107", "#4CAF50",
							"#9C27B0", "#795548", "#607D8B", "#03A9F4",
							"#009688", "#E91E63", "#CDDC39", "#FF5722"];

		//labels = this.getProperty('Labels') ? JSON.parse(this.getProperty('Labels')) : this.yfields;

		var heightProperty = +this.getProperty("Height") || this.jqElement.height();
		var widthProperty = +this.getProperty("Width") || this.jqElement.width();

		this.selectorHeight = showsSelector ? this.getProperty("SelectorHeight") : 0;

		barChartHeight = secondaryChartType == 'barchart' ? this.getProperty('BarChartHeight') : 0;
		barChartPadding = barChartHeight ? barChartPadding : 0;

		this.margin = {	top: 10 + legendCurrentHeight,
						right: 10,
						bottom: this.selectorHeight + (barChartHeight + barChartPadding * 2) + (timelineHeight + timelinePadding * 2) + 30,
						left: rightMargin
						},
		this.margin2 = {top: heightProperty - this.selectorHeight, right: 10, bottom: 20, left: rightMargin},
		this.width = widthProperty - this.margin.left - this.margin.right,
		this.height = heightProperty - this.margin.top - this.margin.bottom,
		this.height2 = heightProperty - this.margin2.top - this.margin2.bottom;

		if (minimal) {
			this.margin = {top: 0, right: 0, bottom: 0, left: 0},
			this.margin2 = {top: heightProperty, right: 0, bottom: 0, left: 0},
			this.width = widthProperty,
			this.height = heightProperty,
			this.height2 = 0;
		}
		
		if (secondaryChartOnly) {
			barChartHeight = chart.jqElement.outerHeight() - chart.margin.top - 15; // The -15 pixels account for the X axis
		}

		// Construct the main SVG
		this.svg = d3.select('#' + this.jqElementId).append("svg")
			.attr("class", "graphRoot")
		    .attr("width", this.width + this.margin.left + this.margin.right)
		    .attr("height", this.height + this.margin.top + this.margin.bottom);

		// Construct the clip path, used by all chart components
		this.svg.append("defs").append("clipPath")
		    .attr("id", "clip-" + chart.jqElementId)
			.append("rect")
			    .attr("width", this.width)
			    .attr("height", this.height);

		// Construct the clip path, used by the secondary charts
		if (secondaryChartType != "none") {
			this.svg.append("defs").append("clipPath")
			    .attr("id", "secondaryClip-" + chart.jqElementId)
				.append("rect")
				    .attr("width", this.width)
				    .attr("height", secondaryChartType == "timeline" ? chart.getProperty('TimelineHeight') : barChartHeight); //chart.getProperty('BarChartHeight'));
		}


		// Construct the effect SVG definitions
		// These are used for such things as drop shadows
		try {

			var defs = this.svg.select("defs");
			var filter = defs.append("filter")
			    .attr("id", "extentshadow")
			    .attr("height", "300%")
			    .attr("y", "-50%");

			// SourceAlpha refers to opacity of graphic that this filter will be applied to
			// convolve that with a Gaussian with standard deviation 3 and store result
			// in blur
			filter.append("feGaussianBlur")
			    .attr("in", "SourceAlpha")
			    .attr("stdDeviation", 6)
			    .attr("result", "blur");

			// translate output of Gaussian blur to the right and downwards with 2px
			// store result in offsetBlur
			filter.append("feOffset")
			    .attr("in", "blur")
			    .attr("dx", 0)
			    .attr("dy", 5)
			    .attr("result", "offsetBlur");

			// overlay original SourceGraphic over translated blurred opacity by using
			// feMerge filter. Order of specifying inputs is important!
			var feMerge = filter.append("feMerge");

			feMerge.append("feMergeNode")
			    .attr("in", "shdow")
			feMerge.append("feMergeNode")
			    .attr("in", "SourceGraphic");


			var filter = defs.append("filter")
			    .attr("id", chart.jqElementId + "labelshadow")
			    .attr("height", "300%")
			    .attr("y", "-50%");

			// SourceAlpha refers to opacity of graphic that this filter will be applied to
			// convolve that with a Gaussian with standard deviation 3 and store result
			// in blur
			filter.append("feGaussianBlur")
			    .attr("in", "SourceAlpha")
			    .attr("stdDeviation", 6)
			    .attr("result", "blur");

			// translate output of Gaussian blur to the right and downwards with 2px
			// store result in offsetBlur
			filter.append("feOffset")
			    .attr("in", "blur")
			    .attr("dx", 0)
			    .attr("dy", 5)
			    .attr("result", "offsetBlur");

			filter.append("feColorMatrix")
				.attr("in", "offsetBlur")
				.attr("type", "matrix")
				.attr("result", "shdow")
				.attr("values", "0 0 0 0   0\
              0 0 0 0   0 \
              0 0 0 0   0 \
              0 0 0 .2 0");

			// overlay original SourceGraphic over translated blurred opacity by using
			// feMerge filter. Order of specifying inputs is important!
			var feMerge = filter.append("feMerge");

			feMerge.append("feMergeNode")
			    .attr("in", "shdow")
			feMerge.append("feMergeNode")
			    .attr("in", "SourceGraphic");

		}
		catch (e) {
			console.log(e.stack);
		}

		// Construct the main chart components
		chart.mainChartInitializeProperties();
		chart.mainChartCreateComponents();

		// Construct the secondary bar chart components if needed
		if (secondaryChartType == 'barchart') {
			this.updateBarChartComponents();
		}
		// Construct the timeline hover group if the timeline is selected
		else if (secondaryChartType == 'timeline') {
			chart.timelineCreateComponents();
			//timelineHoverSVGGroup = chart.mainChartCreateSVGComponentsForHoverOfType('timeline');
		}

		// Construct the threshold components if needed
		if (thresholds) {
		    chart.thresholdCreateComponents();
		}

		chart.eventHandlersInitialize();

	};

	/**
	 * Invoked by the runtime whenever a responsive widget is resized.
	 * @param width <Int>		The new width.
	 * @param height <Int>		The new height.
	 */
	this.resize = function(width,height) {

		//this.timelineHeight = 72;

		try {
		
			if (secondaryChartOnly) {
				barChartHeight = chart.jqElement.outerHeight() - legendCurrentHeight - 25; // The -15 pixels account for the X axis
			}

			this.margin = {	top: 10 + legendCurrentHeight,
							right: 10,
							bottom: this.selectorHeight + (barChartHeight + barChartPadding * 2) + (timelineHeight + timelinePadding * 2) + 30,
							left: rightMargin},
			this.margin2 = {top: height - this.selectorHeight, right: 10, bottom: 20, left: rightMargin},
			this.width = width - this.margin.left - this.margin.right,
			this.height = height - this.margin.top - this.margin.bottom,
			this.height2 = height - this.margin2.top - this.margin2.bottom;

			if (minimal) {
				this.margin = {top: 0, right: 0, bottom: 0, left: 0},
				this.margin2 = {top: height, right: 0, bottom: 0, left: 0},
				this.width = width,
				this.height = height,
				this.height2 = 0;
			}

			// Update the main chart scales and components
			for (var i = 0; i < mainChartYFields.length; i++) {
		    	mainChartYScales[i].range([chart.height, 0]);

		    	var config = mainChartDisplayConfiguration[i] || mainChartDisplayConfigurationDefault;

		    	if (config.line) {
					mainChartLineSVGGroups[i].attr("transform", "translate(" + chart.margin.left + "," + chart.margin.top + ")");
				}

				if (showsSelector) {
					selectorLineSVGGroups[i].attr("transform", "translate(" + chart.margin2.left + "," + chart.margin2.top + ")");
			    	selectorYScales[i].range([chart.height2, 0]);
		    	}

				if (config.fill) {
					mainChartAreaSVGGroups[i].attr("transform", "translate(" + chart.margin.left + "," + chart.margin.top + ")");
				}

				if (config.dataPoint) {
					mainChartDataPointSVGGroups[i].attr("transform", "translate(" + chart.margin.left + "," + chart.margin.top + ")");
				}
			}

			// Update the threshold components and groups if needed
			if (thresholds) {
				for (var i = 0; i < thresholds.length; i++) {
 					thresholdLineSVGGroups[i].attr("transform", "translate(" + chart.margin.left + ", " + chart.margin.top + ")");
				}
			}


			// Update the X scales and X axes
			mainChartXScale.range([0, this.width]);
		    selectorXScale.range([0, this.width]);

		    mainChartXAxisSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + (chart.margin.top + chart.height) + ')');
		    if (showsSelector) {
			    selectorXAxisSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + (chart.margin2.top + chart.height2) + ')');

			    // Update the brush group
			    selectorBrushSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin2.top + ')');
		    }


			// Update the main SVG size
		    chart.svg
			    .attr("width", chart.width + chart.margin.left + chart.margin.right)
			    .attr("height", chart.height + chart.margin.top + chart.margin.bottom);

			// Update the clip used by all charts
			chart.svg.select("#clip-" + chart.jqElementId).select("rect")
			    .attr("width", chart.width)
			    .attr("height", chart.height);
			    
			// Update the secondary clip path if it's used			    
			if (secondaryChartType != "none") {
				chart.svg.select("#secondaryClip-" + chart.jqElementId).select("rect")
					    .attr("width", this.width)
					    .attr("height", secondaryChartType == "timeline" ? chart.getProperty('TimelineHeight') : barChartHeight); //chart.getProperty('BarChartHeight'));
			}


			// Update the mouse event receiver size
			var eventHandlerHeight = chart.height;

			if (secondaryChartType == 'barchart') {
				eventHandlerHeight += barChartPadding * 2 + barChartHeight + 15;
			}
			else if (secondaryChartType == 'timeline') {
				eventHandlerHeight += timelinePadding * 2 + timelineHeight + 15;
			}
			
			if (secondaryChartOnly) {
				eventHandlerHeight = Math.max(barChartHeight, timelineHeight);
			}

			chart.svg.select(".overlay")
			    .attr("width", chart.width)
			    .attr("height", eventHandlerHeight)
			    .attr("x", chart.margin.left)
			    .attr("y", chart.margin.top);

			// The main and secondary charts should update themselves; This will cause all components to resize to the new size.
		    if (chart.data) {
// 			    chart.updateData(chart.data, true);
				chart.mainChartUpdateToData(chart.data, {compactData: chart.compactData, animated: NO});
			}

			if (barChartData) {
				var enabled = animationsEnabled;
				animationsEnabled = NO;
				chart.updateBarChartComponents();
				chart.updateBarChart();
				animationsEnabled = enabled;
			}

		    if (chart.timelineData) {
			    chart.updateTimeline(chart.timelineData, true);
			}

			if (thresholds) {
				chart.thresholdUpdateAnimated(NO);
			}

		}
		catch (e) {
			console.log(e.stack);
		}

	};

	/**
	 * Invoked by the runtime whenever any bound property is updated.
	 * {
	 *	@param TargetProperty <String>				The updated property's name.
	 *	@param SinglePropertyValue <AnyObject>		The updated property's new value.
	 * 	@param RawSinglePropertyValue <AnyObject>	The updated property's new value, as it was sent by the update source, without any type coercions.
	 *	@param ActualDataRows <[Object]>			For infotable properties, the rows array of the infotable.
	 * }
	 */
	this.updateProperty = function(updatePropertyInfo) {
		var key = updatePropertyInfo.TargetProperty;

		/*********************************** RANGES *********************************/

		// Ranges are processed instantly rather than being dispatched and grouped like the rest of the updates
		if (key == 'RangeStart') {
			if (!selectorBrush) return;
			if (chart.blocksRangeUpdates) return;
			chart.blocksRangeUpdates = YES;

			try {
				var extent = selectorBrush.extent();
				extent[0] = updatePropertyInfo.RawSinglePropertyValue;
				selectorBrush.extent(extent);

				if (showsSelector) selectorBrushSVGGroup.call(selectorBrush);
				chart.mainChartBrushExtentDidChange();
			}
			finally {
				chart.blocksRangeUpdates = NO;
			}
			return;
		}
		else if (key == 'RangeEnd') {
			if (!selectorBrush) return;
			if (chart.blocksRangeUpdates) return;
			chart.blocksRangeUpdates = YES;

			try {
				var extent = selectorBrush.extent();
				extent[1] = updatePropertyInfo.RawSinglePropertyValue;
				selectorBrush.extent(extent);

				if (showsSelector) selectorBrushSVGGroup.call(selectorBrush);
				chart.mainChartBrushExtentDidChange();
			}
			finally {
				chart.blocksRangeUpdates = NO;
			}
			return;
		}

		/*********************************** LOCALE *********************************/

		if (key == 'TimeFormatLocale') {
			chart.dispatchUpdateWithType('TimeFormatLocale', {contents: updatePropertyInfo.SinglePropertyValue});

			return;
		}

		/*********************************** THRESHOLDS *********************************/

		if (key == 'Tresholds') {
			try {
				var newThresholds = JSON.parse(updatePropertyInfo.SinglePropertyValue);
				chart.dispatchUpdateWithType('Tresholds', {contents: newThresholds});
			}
			catch (e) {

			}
			return;
		}

		/*********************************** MAIN CHART *****************************/

		if (key == 'Data') {
			chart.dispatchUpdateWithType('Data', {contents: updatePropertyInfo.ActualDataRows});
	        return;
		}
		else if (key == 'YFields') {
			try {
				var newYFields = JSON.parse(updatePropertyInfo.SinglePropertyValue);
				chart.dispatchUpdateWithType('YFields', {contents: newYFields});
		        return;
			}
			catch (error) {
				console.log('Unable to update the Y fields. The error was ' + error);
			}
		}
		else if (key == 'Labels') {
			try {
				var newLabels = JSON.parse(updatePropertyInfo.SinglePropertyValue) || [];
				chart.dispatchUpdateWithType('Labels', {contents: newLabels});
			}
			catch (e) {

			}

			return;
		}
		else if (key == 'YFieldColors') {
			try {
				var newColors = JSON.parse(updatePropertyInfo.SinglePropertyValue) || [];
				chart.dispatchUpdateWithType('YFieldColors', {contents: newColors});
			}
			catch (e) {

			}

			return;
		}
		else if (key == 'Patters') {
			try {
				var newPatterns = JSON.parse(updatePropertyInfo.SinglePropertyValue) || [];
				chart.dispatchUpdateWithType('Patterns', {contents: newPatterns});
			}
			catch (e) {

			}

			return;
		}
		else if (key == 'StrokeWidths') {
			try {
				var newStrokeWidths = JSON.parse(updatePropertyInfo.SinglePropertyValue) || [];
				chart.dispatchUpdateWithType('YFieldColors', {contents: newStrokeWidths});
			}
			catch (e) {

			}

			return;
		}
		else if (key == 'Interpolation') {
			chart.interpolation = updatePropertyInfo.SinglePropertyValue;
			chart.dispatchUpdateWithType('Interpolation', {contents: chart.interpolation});
		}
		else if (key == 'DisplayConfiguration') {
			try {
				var config = JSON.parse(updatePropertyInfo.SinglePropertyValue);
				chart.dispatchUpdateWithType('DisplayConfiguration', {contents: config});
			}
			catch (e) {

			}
			return;
		}

		/************** LEGACY TIMELINE *************/

		if (key == "TimelineData") {
			if (secondaryChartType != 'timeline') return;

			var timelineData = updatePropertyInfo.ActualDataRows;

			if (!timelineXEndField) {
				var timelineLength = timelineData.length;
				for (var i = 0; i < timelineLength; i++) {
					timelineData[i]['__D3RangeChart__end__' + timelineXStartField] = (i == timelineLength - 1 ? Math.max(Date.now(), timelineData[i][timelineXStartField]) : timelineData[i + 1][timelineXStartField] );
				}
			}

			chart.timelineData = timelineData;
			chart.dispatchUpdateWithType('TimelineData', {contents: timelineData});
			return;
		}

		/************** BARCHART *************/

		if (key == 'BarChartData') {
			chart.dispatchUpdateWithType('BarChartData', {contents: updatePropertyInfo.ActualDataRows});
			return;
		}
		else if (key == 'BarChartYFields') {
			chart.dispatchUpdateWithType('BarChartYFields', {contents: updatePropertyInfo.SinglePropertyValue});
			return;
		}
		else if (key == 'BarChartColors') {
			chart.dispatchUpdateWithType('BarChartColors', {contents: updatePropertyInfo.SinglePropertyValue});
			return
		}
		else if (key == 'BarChartLabels') {
			chart.dispatchUpdateWithType('BarChartLabels', {contents: updatePropertyInfo.SinglePropertyValue});
			return;
		}
	};





	/***************************************** LEGEND ****************************************/

	/**
	 * The jQuery element containing all legend entries.
	 */
	var legendRootElement;

	/**
	 * The current legend height.
	 */
	var legendCurrentHeight = 28;

	/**
	 * If set to YES, the legend will be aligned to the left.
	 */
	var legendAlignLeft = NO;

	/**
	 * Constructs and returns a new jQuery element to display on the legend.
	 * This method will not automatically append the new legend element to the legend.
	 * @param type <String>				Must be either 'line', 'threshold' or 'bar'. The type of the legend element.
	 * {
	 *	@param withColor <String>		The color of the element.
	 *	@param label <String>			The label of the element.
	 *	@param identifier <String>		An identifier to add to this element.
	 * }
	 */
	this.legendCreateElementOfType = function (type, options) {
		// The container legend element
		var element = $('<div data-identifier="' + options.identifier + '" data-type="' + type + '" style="height: 24px; position: absolute; padding-left: 8px; padding-right: 8px;">');

		// The element type indicator icon
		var elementIcon;

		if (type == 'line' || type == 'threshold') {
			elementIcon = $('<div class="D3RangeChartElementIcon" style="position: relative; width: 24px; height: 4px; display: inline-block; background: ' + options.withColor + '">');
		}
		else if (type == 'bar') {
			elementIcon = $(
				'<div class="D3RangeChartElementIcon" style="position: relative; width: 4px; height: 10px; top: 2px; display: inline-block; background: ' + options.withColor + '"></div>\
				 <div class="D3RangeChartElementIcon" style="position: relative; width: 4px; height: 18px; top: 2px; margin-left: 2px; display: inline-block; background: ' + options.withColor + '"></div>');
		}

		element.append(elementIcon);

		// The element label; bar elements need additional adjustments for the label position
		element.append('<div class="D3RangeChartElementLabel" style="display: inline-block; font-family: \'Open Sans\'; font-size: 14px; color: #666; line-height: 24px; vertical-align: middle; ' + (type == 'bar' ? 'position: relative; top: -2px;' : '')  + '">&nbsp;&nbsp;' + options.label + '</div>');

		element.data('type', type);

		return element;
	}

	/**
	 * Set to YES after the legend is first rendered.
	 */
	var legendRendered = NO;

	/**
	 * Should be invoked to create the legend.
	 * @param animated <Boolean, nullable>		Defaults to YES. If set to YES, the change will be animated, otherwise the change will be instant.
	 * @return <Boolean>						YES if the legend's height changed, NO otherwise.
	 */
	this.legendUpdateAnimated = function (animated) {

		// Construct the legend root element if it doesn't exist.
		if (!legendRootElement) {
			legendRootElement = $('<div class="legend" style="position: relative; padding-left: ' + chart.margin.left + 'px; left: 0px; top: 0px;">');
			chart.jqElement.prepend(legendRootElement);
		}

		var legendElements = [];

		// Prepare the old elements for removal
		var currentChildren = legendRootElement.children().data('isRemoved', YES);

		// The main chart components
		if (!secondaryChartOnly) for (var i = 0; i < mainChartYFields.length; i++) {
			var currentElement = legendRootElement.find('[data-identifier="' + mainChartYFields[i] + '"][data-type="line"]');

			if (currentElement.length) {
				// If the element already exists
				currentElement.data('isRemoved', NO);
				currentElement.find('.D3RangeChartElementIcon').css({background: mainChartColors[i] || chart.defaultColors[i]});
				currentElement.find('.D3RangeChartElementLabel').html('&nbsp;&nbsp;' + mainChartLabels[i] || mainChartYFields[i]);
			}
			else {
				// Otherwise construct it
				currentElement = chart.legendCreateElementOfType('line', {withColor: mainChartColors[i] || chart.defaultColors[i],
																			  label: mainChartLabels[i] || mainChartYFields[i],
																		 identifier: mainChartYFields[i]});

				// And add it to the legend
				currentElement.css({opacity: 0});
				currentElement.data('isNewElement', YES);
				legendRootElement.append(currentElement);
			}

			legendElements.push(currentElement);
		}

		// Threshold components
		if (thresholds) {
			for (var i = 0; i < thresholds.length; i++) {
				var currentElement = legendRootElement.find('[data-identifier="' + thresholds[i].label + '"][data-type="threshold"]');

				if (currentElement.length) {
					// If the element already exists
					currentElement.data('isRemoved', NO);
					currentElement.find('.D3RangeChartElementIcon').css({background: thresholds[i].color || chart.defaultColors[i]});
					currentElement.find('.D3RangeChartElementLabel').html('&nbsp;&nbsp;' + thresholds[i].label);
				}
				else {
					// Otherwise construct it
					currentElement = chart.legendCreateElementOfType('threshold', {withColor: thresholds[i].color || chart.defaultColors[i],
																				 	   label: thresholds[i].label,
																				  identifier: thresholds[i].label});

					// And add it to the legend
					currentElement.css({opacity: 0});
					currentElement.data('isNewElement', YES);
					legendRootElement.append(currentElement);
				}

				legendElements.push(currentElement);
			}
		}

		// Bar chart components
		if (secondaryChartType == 'barchart' && chart.getProperty('BarChartShowsLegend')) {
			for (var i = 0; i < barChartYFields.length; i++) {
				var currentElement = legendRootElement.find('[data-identifier="' + barChartYFields[i] + '"][data-type="bar"]');

				if (currentElement.length) {
					// If the element already exists
					currentElement.data('isRemoved', NO);
					currentElement.find('.D3RangeChartElementIcon').css({background: barChartColors[i] || chart.defaultColors[i]});
					currentElement.find('.D3RangeChartElementLabel').html('&nbsp;&nbsp;' + barChartLabels[i] || barChartYFields[i]);
				}
				else {
					// Otherwise construct it
					currentElement = chart.legendCreateElementOfType('bar', {withColor: barChartColors[i] || chart.defaultColors[i],
																				 label: barChartLabels[i] || barChartYFields[i],
																			identifier: barChartYFields[i]});

					// And add it to the legend
					currentElement.css({opacity: 0});
					currentElement.data('isNewElement', YES);
					legendRootElement.append(currentElement);
				}

				legendElements.push(currentElement);
			}
		}

		// Destroy all removed elements
		for (var i = 0; i < currentChildren.length; i++) {
			var child = currentChildren.eq(i);

			if (child.data('isRemoved')) {
				if (animated) {
					// Velocity is much faster than jQuery; it should be used whenever possible for HTML element animations
					var animationFunction;
					if ($.Velocity) {
						animationFunction = 'velocity';
						var properties = {
							opacity: 0,
							translateY: '+=12px',
							translateZ: 0,
							scaleY: 0
						}
						var easing = 'easeInOutQuad';
					}
					else {
						animationFunction = 'animate';
						var properties = {
							opacity: 0
						}
						var easing = undefined;
					}
					child[animationFunction](properties, {
						duration: animationDuration,
						complete: function () { $(this).remove(); },
						easing: easing
					});
				}
				else {
					child.remove();
				}
			}
		}

		// Find out where each item should be positioned
		var xCaret = legendAlignLeft ? 0 : chart.width;
		var yCaret = 0;
		var xCaretLimit = legendAlignLeft ? chart.width : chart.margin.left;
		var multiplier = legendAlignLeft ? 1 : -1;

		for (var i = 0; i < legendElements.length; i++) {
			var element = legendElements[i];
			var width = legendElements[i].outerWidth();

			if (!legendAlignLeft) xCaret += width * multiplier;

			// If the element no longer fits on the current line, move it to next one
			if ((legendAlignLeft ? (xCaret + width) > xCaretLimit : xCaret < xCaretLimit)) {
				yCaret += 28;
				xCaret = legendAlignLeft ? 0 : chart.width + width * multiplier;
			}

			// Move the element to its new position
			if (animated) {
				if (element.data('isNewElement')) {
					element.removeData('isNewElement');
					// The initial values for new elements
					// Velocity is much faster than jQuery; it should be used whenever possible for HTML element animations
					if ($.Velocity) {
						$.Velocity.hook(element, 'translateX', xCaret + 'px');
						$.Velocity.hook(element, 'translateY', (yCaret + 12) + 'px');
						$.Velocity.hook(element, 'scaleY', 0);
					}
					else {
						element.css({left: xCaret + 'px', top: (yCaret + 12) + 'px'});
					}
				}

				if ($.Velocity) {
					element.velocity({translateX: xCaret + 'px', translateY: yCaret + 'px', opacity: 1, translateZ: 0, scaleY: 1}, {duration: animationDuration, easing: 'easeInOutQuad'});
				}
				else {
					element.animate({left: xCaret + 'px', top: yCaret + 'px', opacity: 1}, {duration: animationDuration});
				}
			}
			else {
				element.css({left: xCaret + 'px', top: yCaret + 'px', opacity: 1});
			}

			if (legendAlignLeft) xCaret += width * multiplier;
		}

		// Compute the size difference between the new and old height.
		var legendHeight = yCaret + 28;

		if (legendHeight != legendCurrentHeight) {
			var difference = legendHeight - legendCurrentHeight;

			// The height and top margin must be changed

			chart.margin.top += difference;
			chart.height -= difference;

			// Move the chart components
			for (var i = 0; i < mainChartYFields.length; i++) {
				var config = mainChartDisplayConfiguration[i] || mainChartDisplayConfigurationDefault;

				// Resize the Y scale ranges
		    	mainChartYScales[i].range([chart.height, 0]);

				if (config.line) {
					var group = mainChartLineSVGGroups[i];
					if (animated) group = group.transition().duration(animationDuration);
					group.attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin.top + ')');
				}

				if (config.fill) {
					group = mainChartAreaSVGGroups[i];
					if (animated) group = group.transition().duration(animationDuration);
					group.attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin.top + ')');
				}

				if (config.dataPoint) {
					group = mainChartDataPointSVGGroups[i];
					if (animated) group = group.transition().duration(animationDuration);
					group.attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin.top + ')');
				}
			}

			// Move the Y axis
			var group = mainChartYAxisSVGGroup;
			if (animated) group = group.transition().duration(animationDuration);
			group.attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin.top + ')');

			// Update the threshold components and groups if needed
			if (thresholds) {
				for (var i = 0; i < thresholds.length; i++) {
					group = thresholdLineSVGGroups[i];
					if (animated) group = group.transition().duration(animationDuration);
 					group.attr("transform", "translate(" + chart.margin.left + ", " + chart.margin.top + ")");
				}
			}

			legendCurrentHeight = legendHeight;


			legendRendered = YES;
			return YES;

		}


		legendRendered = YES;
		return NO;

	};





	/***************************************** UPDATES ****************************************/

	// For the D3 Range Chart widget, updates happen somewhat differently than most widgets.
	// Because it is highly configurable at runtime, there are multiple properties that affect the widget's configuration;
	// Whenever any of these properties are changed, the configuration has to be partially recreated and the data updated to match it.
	// Because of the way that property updates normally happen in Thingworx, there is no way to detect if multiple properties are
	// updated at the same time from the same source and in these cases a lot of extra work has to be done since the configuration and data
	// are repeatedly updated.
	// To optimize this, all property updates are handed off to D3RangeChart.dispatchUpdateWithType(contents:delay:) which batches all
	// property updates until the next event processing loop.
	// Additionally, multiple updates on the same property are ignored; only the last update of the same type will be processed

	/**
	 * The list of updates that need to be processed.
	 */
	var pendingUpdates = {};

	/**
	 * A token indicating whether there are already updates waiting to be processed or not.
	 */
	var pendingUpdateToken;

	/**
	 * Dispatches the given update so it is processed on the next run loop.
	 * This allows multiple successive to be processed together and in the same order.
	 * For instance, if the same service returns both the data set and the associated y fields, it is possible that
	 * the D3 Range Chart will first receive the new data and attempt to display it even though the old y fields are no longer available.
	 * @param type <String>				The property associated with the update.
	 * {
	 *	@param contents <AnyObject>		The update contents. The actual value contained in this parameter depends on the update type.
	 *	@param delay <Int, nullable>	Defaults to the animation duration, unless this value is greater than 500.
	 *									A delay to wait for other updates before processing them. A delay of 0 means that
	 *									the update processing will happen as soon as the current and other scheduled events have finished processing.
	 *									In practice, this means that the default only handles the cases where all updates come from the same service.
	 *									If updates are already scheduled, this parameter is ignored.
	 * }
	 */
	this.dispatchUpdateWithType = function (type, options) {
		// Add the update to the pending updates
		pendingUpdates[type] = options.contents;

		if (!pendingUpdateToken) {
			// Schedule the update if it wasn't already
			pendingUpdateToken = window.setTimeout(this.handleUpdates, options.delay === undefined ? Math.min(500, animationDuration) : options.delay);
		}
	};

	/**
	 * Invoked when updates should be handled. This function will be invoked on the global context.
	 */
	this.handleUpdates = function () {
		pendingUpdateToken = undefined;

		// These control variables decide which structure/data updates should happen at the end of the update loop
		var dataUpdateNeeded = NO;
		var dataUpdateShouldReapplyProperties = NO;
		var dataUpdateShouldRapplyDataPoints = NO;
		var dataUpdateNewData;
		var dataUpdateCompactData;
		var dataUpdateOldData;

		var thresholdUpdateNeeded = NO;
		var thresholdShouldReapplyProperties = NO;

		var legendUpdateNeeded = !legendRendered;

		var barChartComponentUpdateNeeded = NO;
		var barChartColorUpdateNeeded = NO;
		var barChartUpdateNeeded = NO;

		var timelineUpdateNeeded = NO;

		var newConfiguration, oldConfiguration;

		//******************* MAIN CHART SPECIFIC UPDATES ***********************

		if ('TimeFormatLocale' in pendingUpdates) {
			var localeDefinition;

			try {
				localeDefinition = JSON.parse(pendingUpdates.TimeFormatLocale);
				d3Locale = d3.locale(localeDefinition);

				if (timeFormat) {
					mainChartXAxis.tickFormat(d3Locale.timeFormat(timeFormat));
					selectorXAxis.tickFormat(d3Locale.timeFormat(timeFormat));
				}
				else {
					var format = d3Locale.timeFormat.multi([
					  [".%L", function(d) { return d.getMilliseconds(); }],
					  [":%S", function(d) { return d.getSeconds(); }],
					  ["%I:%M", function(d) { return d.getMinutes(); }],
					  ["%I %p", function(d) { return d.getHours(); }],
					  ["%a %d", function(d) { return d.getDay() && d.getDate() != 1; }],
					  ["%b %d", function(d) { return d.getDate() != 1; }],
					  ["%B", function(d) { return d.getMonth(); }],
					  ["%Y", function() { return true; }]
					]);

					mainChartXAxis.tickFormat(format);
					selectorXAxis.tickFormat(format);
				}

				dataUpdateNeeded = YES;
				dataUpdateNewData = chart.data;
				dataUpdateUpdateCompactData = chart.compactData;

				barChartUpdateNeeded = YES;
				timelineUpdateNeeded = YES;

			}
			catch (e) {

			}
		}

		if ('DisplayConfiguration' in pendingUpdates) {
			newConfiguration = pendingUpdates.DisplayConfiguration;
			oldConfiguration = mainChartDisplayConfiguration;

			dataUpdateNeeded = YES;
			dataUpdateCompactData = chart.compactData;
			dataUpdateNewData = chart.data;
			dataUpdateOldData = chart.data;
			dataUpdateShouldReapplyProperties = YES;
			dataUpdateShouldRapplyDataPoints = YES;
		}

		// handle Y field updates
		if ('YFields' in pendingUpdates) {
			var newYFields = pendingUpdates.YFields;
			var oldYFields = mainChartYFields;

			// Obtain the difference in counts and just re-initialize the new components or delete the old components
			var difference = newYFields.length - mainChartYFields.length;

			if (difference > 0) {
				mainChartYFields = newYFields;

				if (newConfiguration) mainChartDisplayConfiguration = newConfiguration;
				// There are more new Y fields than there were before
				chart.mainChartCreateComponentsWithStartIndex(oldYFields.length, {endIndex: mainChartYFields.length});
			}
			else if (difference < 0) {
				// There are fewer new Y fields than there were before
				chart.mainChartTruncateFinalComponentsWithCount(-difference, {animated: animationsEnabled});
				mainChartYFields = newYFields;
			}

			// The data should be redrawn; it is likely that even if the Y field count remains constant
			// the old data paths no longer match the new Y fields
			if (chart.data) {
				dataUpdateNeeded = YES;
				dataUpdateShouldReapplyProperties = YES;

				dataUpdateNewData = chart.data;
				dataUpdateOldData = chart.data;
				dataUpdateCompactData = chart.compactData;

				// Whenever the data or Y fields change, the thresholds must update as well
				// because they Y scales could change which affects each threshold's position
				thresholdUpdateNeeded = YES;
			}

			// Redraw the legend
			legendUpdateNeeded = YES;
		}

		if ('DisplayConfiguration' in pendingUpdates) {
			mainChartDisplayConfiguration = newConfiguration;

			for (var i = 0; i < mainChartYFields.length; i++) {
				chart.mainChartUpdateConfigurationForFieldAtIndex(i, {fromConfiguration: oldConfiguration[i] || mainChartDisplayConfigurationDefault,
																		toConfiguration: newConfiguration[i] || mainChartDisplayConfigurationDefault})
			}

			chart.mainChartBringComponentsToFront();
		}

		// Data updates
		if ('Data' in pendingUpdates && pendingUpdates.Data) {
			var data = pendingUpdates.Data;

			if (chart.getProperty('DataAutoSort')) {
				data = data.slice().sort(function (a, b) {
					return a[mainChartXField] - b[mainChartXField];
				});
			}

			// If the first data point is newer than the last data point, the data is either sorted in the wrong order or not sorted at all.
			// At this point, the chart only handles the cases when the data is sorted in the wrong order.
			// In this case, the data is flipped
			if (data[data.length - 1][mainChartXField] < data[0][mainChartXField]) {
				flipped = true;
				data = data.slice().reverse();
			}
			else {
				data = data.slice();
				flipped = false;
			}

	        length = data.length;
	        for (var i = 0; i < length; i++) {
		        // Corece the date time to a unix timestamp
	        	data[i][mainChartXField] = +data[i][mainChartXField];

				// Corece the Y fields to numbers and fill in the missing values if needed
			  	for (var j = 0; j < mainChartYFields.length; j++) {
				  	var yField = mainChartYFields[j];

				  	// Coerce each of the fields to a number
					var value = +data[i][yField];

					if (isNaN(value)) {
						if (missingValues == 'closest') {
							// Get the previous value
							if (i != 0) value = data[i - 1][yField];
						}
						else if (missingValues == 'interpolate') {
							if (i != 0 && i < length - 1) {
								// Get the previous value
								var previousValue = data[i - 1][yField];
								var previousTimestamp = data[i - 1][mainChartXField];

								// Get the next nonnull value
								var nextValue = NaN;
								var nextTimestamp = data[i][mainChartXField];
								for (var k = i + 1; k < length; k++) {
									if (!isNaN(data[k][yField])) {
										nextValue = data[k][yField];
										nextTimestamp = data[k][mainChartXField];
										break;
									}
								}

								// If there are no more nonnull values, there is nothing left to do
								if (!isNaN(nextValue)) {
									var timePercentage = (data[i][mainChartXField] - previousTimestamp) / (nextTimestamp - previousTimestamp);

									// interpolate the previous and next values
									value = (nextValue - previousValue) * timePercentage + previousValue;
								}
							}
						}
					}

			  		data[i][yField] = isNaN(value) ? undefined : value;
				}

	        }

	        // Interpolate the lines for non-linear scales and linear interpolation
	        if (chart.interpolation == 'linear' && mainChartScaleType != 'linear' && length > 1 && mainChartNonLinearScaleInterpolationInterval > 0) {
		        // Save the unmodified data for later use
		        dataUpdateCompactData = data.slice();

		        var time = data[0][mainChartXField];
		        var index = 0;
		        var baseTime = time;
		        var nextTime = data[1][mainChartXField];

		        var rowsToAdd = [];

		        while (true) {
			        // Advance every mainChartNonLinearScaleInterpolationInterval miliseconds and add an interpolated point until reaching the end of the graph
			        time += mainChartNonLinearScaleInterpolationInterval;

			        // Advance the index until the time value at index is lower than the interpolation time
			        while (nextTime < time) {
				        index++;
				        if (index == length - 1) break;

				        baseTime = nextTime;
				        nextTime = data[index + 1][mainChartXField];
			        }

			        if (index == length - 1) break;

			        var percent = (time - baseTime) / (nextTime - baseTime);

			        if (percent == 0 || percent == 1) continue;

			        var row = {};
			        row[mainChartXField] = time;

			        // Interpolate each Y field value and add it to the row
			        for (var i = 0; i < mainChartYFields.length; i++) {
				        var field = mainChartYFields[i];
				        row[field] = percent * (data[index + 1][field] - data[index][field]) + data[index][field];
			        }

			        rowsToAdd.push({index: index + 1, row: row});

		        }

		        // Add the new rows
		        while (rowsToAdd.length) {
			        var row = rowsToAdd.pop();
			        data.splice(row.index, 0, row.row);
		        }
	        }
	        else {
		        dataUpdateCompactData = data;
	        }

			dataUpdateNewData = data;
			dataUpdateOldData = chart.data;
			dataUpdateNeeded = YES;

			// Whenever the data changes, the secondary chart must update as well
			// because they X scale could change which affects the chart's position
	        if (secondaryChartType == 'barchart' && barChartData) {
		        barChartUpdateNeeded = YES;
	        }

	        if (secondaryChartType == 'timeline' && chart.timelineData) {
		        timelineUpdateNeeded = YES;
	        }

			// Whenever the data or Y fields change, the thresholds must update as well
			// because they Y scales could change which affects each threshold's position
			thresholdUpdateNeeded = YES;
		}

		if ('Interpolation' in pendingUpdates) {
			dataUpdateNeeded = YES;
		}

		// Attribute updates
		if ('YFieldColors' in pendingUpdates) {
			legendUpdateNeeded = YES;
			mainChartColors = pendingUpdates.YFieldColors || [];

			if (dataUpdateNeeded) {
				// If data has to be updated anyway, just tell the chart to update its properties
				dataUpdateShouldReapplyProperties = YES;
			}
			else {
				// Otherwise, just the new colors could be applied
				for (var i = 0; i < mainChartYFields.length; i++) {
					var selection = mainChartLineSVGGroups[i].select('path');
					selection = animationsEnabled ? selection.transition().duration(animationDuration) : selection;
					selection.style('stroke', mainChartColors[i] || chart.defaultColors[i]);
				}
			}
		}

		if ('StrokeWidths' in pendingUpdates) {
			mainChartStrokeWidths = pendingUpdates.StrokeWidths || [];

			if (dataUpdateNeeded) {
				// If data has to be updated anyway, just tell the chart to update its properties
				dataUpdateShouldReapplyProperties = YES;
			}
			else {
				// Otherwise, just the new stroke withds could be applied
				for (var i = 0; i < mainChartYFields.length; i++) {
					var selection = mainChartLineSVGGroups[i].select('path');
					selection = animationsEnabled ? selection.transition().duration(animationDuration) : selection;
					selection.style('stroke-widths', mainChartStrokeWidths[i] || 2);
				}
			}
		}

		if ('Patterns' in pendingUpdates) {
			mainChartPatterns = pendingUpdates.Patterns || [];

			if (dataUpdateNeeded) {
				// If data has to be updated anyway, just tell the chart to update its properties
				dataUpdateShouldReapplyProperties = YES;
			}
			else {
				// Otherwise, just the new stroke withds could be applied
				for (var i = 0; i < mainChartYFields.length; i++) {
					var selection = mainChartLineSVGGroups[i].select('path');
					selection = animationsEnabled ? selection.transition().duration(animationDuration) : selection;
					selection.style('stroke-dasharray', mainChartPatterns[i] || 2);
				}
			}
		}

		if ('Labels' in pendingUpdates) {
			mainChartLabels = pendingUpdates.Labels || [];
			legendUpdateNeeded = YES;
		}

		//******************* BAR CHART SPECIFIC UPDATES ***********************

		if ('BarChartData' in pendingUpdates) {
			barChartUpdateNeeded = YES;
			barChartData = pendingUpdates.BarChartData;
		}

		if ('BarChartYFields' in pendingUpdates) {
			try {
				barChartYFields = JSON.parse(pendingUpdates.BarChartYFields);

				barChartComponentUpdateNeeded = YES;
				barChartUpdateNeeded = YES;
				legendUpdateNeeded = YES;
			}
			catch (error) {
				console.log(error);
			}
		}

		if ('BarChartColors' in pendingUpdates) {
			try {
				barChartColors = JSON.parse(pendingUpdates.BarChartColors);

				barChartColorUpdateNeeded = YES;
				legendUpdateNeeded = YES;
			}
			catch (error) {
				console.log(error);
			}
		}

		if ('BarChartLabels' in pendingUpdates) {
			try {
				barChartLabels = JSON.parse(pendingUpdates.BarChartLabels);

				legendUpdateNeeded = YES;
			}
			catch (error) {
				console.log(error);
			}
		}

		//******************* TIMELINE SPECIFIC UPDATES ***********************

		if ('TimelineData' in pendingUpdates) {
			timelineUpdateNeeded = YES;
		}

		//******************* THRESHOLD SPECIFIC UPDATES ***********************

		if ('Thresholds' in pendingUpdates) {
			var oldThresholds = thresholds;
			var newThresholds = pendingUpdates.Thresholds;

			// Obtain the difference in counts and just re-initialize the new components or delete the old components
			var difference = newThresholds.length - oldThresholds.length;

			if (difference > 0) {
				thresholds = newThresholds;
				// There are more new thresholds than there were before
				chart.thresholdCreateComponentsWithStartIndex(oldThresholds.length, {endIndex: newThresholds.length});
			}
			else if (difference < 0) {
				// There are fewer new thresholds than there were before
				chart.thresholdTruncateFinalComponentsWithCount(-difference, {animated: animationsEnabled});
				thresholds = newThresholds;
			}

			thresholdUpdateNeeded = YES;
			thresholdShouldReapplyProperties = YES;
			legendUpdateNeeded = YES;
		}

		//******************* ACTUAL UPDATE HANDLERS ***********************

		// The legend can change the height of the chart so it should be the first update before any chart update
		if (legendUpdateNeeded && chart.showLegend) {
			var resizeNeeded = chart.legendUpdateAnimated(animationsEnabled);

			if (resizeNeeded) {
				dataUpdateNeeded = YES;
				dataUpdateNewData = dataUpdateNewData || chart.data;
				dataUpdateCompactData = dataUpdateCompactData || chart.compactData;
			}
		}

		// The main chart should be updated first as the secondary chart often depends on the main chart's scales and extents
		if (dataUpdateNeeded) {
			chart.mainChartUpdateToData(dataUpdateNewData, {fromData: dataUpdateOldData, compactData: dataUpdateCompactData,
				reapplyProperties: dataUpdateShouldReapplyProperties, reapplyDataPoints: dataUpdateShouldRapplyDataPoints, animated: animationsEnabled});
			chart.data = dataUpdateNewData;
			chart.compactData = dataUpdateCompactData;
		}

		if (secondaryChartType == 'barchart') {
			if (barChartComponentUpdateNeeded) chart.updateBarChartComponents();
		    if (barChartUpdateNeeded) chart.updateBarChart();

		    // Updating bar chart data always reassigns colors, so it doesn't make sense to ever update both
		    if (!barChartUpdateNeeded && barChartColorUpdateNeeded) chart.updateBarChartColors();
		}

		if (secondaryChartType == 'timeline') {
			if (timelineUpdateNeeded) chart.timelineUpdateWithData(chart.timelineData, {animated: animationsEnabled});
		}

		if (thresholdUpdateNeeded) {
			chart.thresholdUpdateAnimated(animationsEnabled, {reapplyProperties: thresholdShouldReapplyProperties});
		}



		// Reset the pending updates
		pendingUpdates = {};
	};


	/***************************************** MAIN CHART *****************************************/

	// Generic properties

	/**
	 * Controls whether the main chart shows fills or data points.
	 */
	var mainChartShowsFills = NO, mainChartShowsDataPoints = NO, mainChartShowsLines = YES;

	/**
	 * Controls whether the main chart is additive or not.
	 */
	var mainChartIsAdditive = NO;

	/**
	 * The per-field display configuration for the chart. This controls on a per-field basis whether lines, fills or data points are drawn.
	 * The protocol for a configuration object is:
	 * 	- line <Boolean, nullable>			Defaults to NO. If set to YES, the chart will draw a line for this field.
	 *	- fill <Boolean, nullable>			Defaults to NO. If set to YES, the chart will draw a fill for this field.
	 *	- fillOpacity <Number, nullable>	Defaults to 0.1. Must be used with fill. Controls the opacity of the fill for this field.
	 *	- dataPoint <Boolean, nullable>		Defaults to NO. If set to YES, the chart will draw data points for this field.
	 *	- dataPointStyle <String, nullable>	Defaults to 'fill'. Must be one of 'fill' or 'stroke'. Controls how the data points will appear for this field.
	 *	- dataPointSize <Number, nullable>	Defaults to 25. The size of the data points for this field.
	 *	- dataPointShape <String, nullable>	Defaults to 'circle'. Must be one of 'circle', 'cross', 'diamond', 'square', 'triangle-down' or 'triangle-up'.
	 *										The type of symbol to use for the data point.
	 */
	var mainChartDisplayConfiguration, mainChartHasPerFieldConfiguration = NO;

	/**
	 * The default display configuration to use for fields that don't have a display configuration attached.
	 */
	var mainChartDisplayConfigurationDefault = {line: YES};

	// D3 properties

	/**
	 * The field names for the main chart.
	 */
	var mainChartYFields = [];

	/**
	 * The labels for the main chart.
	 */
	var mainChartLabels = [];

	/**
	 * The colors for the main chart.
	 */
	var mainChartColors = [];

	/**
	 * The stroke widths for the main chart.
	 */
	var mainChartStrokeWidths = [];

	/**
	 * The dash patterns for the main chart.
	 */
	var mainChartPatterns = [];

	/**
	 * The SVG groups for the main chart.
	 */
	var mainChartLineSVGGroups = [], mainChartAreaSVGGroups, mainChartDataPointSVGGroups;

	/**
	 * The SVG groups for the selector chart.
	 */
	var selectorLineSVGGroups = [];

	/**
	 * The SVG groups containing the hover circles, text and tooltip backgrounds for the main chart.
	 */
	var mainChartHoverSVGGroups = [];

	/**
	 * The SVG group containing the hover circle, text and tooltip background for the time.
	 */
	var mainChartTimestampSVGHoverGroup;

	/**
	 * The SVG group containing the hover circle, text and tooltip background for the time, if ShowsTimeOnHover is enabled.
	 */
	var timeHoverSVGGroup;

	/**
	 * Used in animations. D3 components that always return with the correct X point and the Y point always set to the bottom.
	 */
	var mainChartLineInitialComponent, selectorLineInitialComponent, mainChartAreaInitialComponent;

	/**
	 * The D3 components for the main chart lines, areas and points.
	 */
	var mainChartLineComponents = [], mainChartAreaComponents, mainChartDataPointComponents;

	/**
	 * The D3 line components for the selector chart.
	 */
	var selectorLineComponents = [];

	/**
	 * The Y scales for the main chart. When shared Y axis is selected, this will only contain one object.
	 */
	var mainChartYScales = [];

	/**
	 * The Y scales for the selector chart. When shared Y axis is selected, this will only contain one object.
	 */
	var selectorYScales = [];

	/**
	 * The type of scale to use for the main chart Y values. Must be one of 'linear', 'log', 'pow' or 'sqrt'.
	 * When the type is 'log' or 'pow', the mainChartScaleFactor contains the base or exponent of the scale.
	 */
	var mainChartScaleType, mainChartScaleFactor;

	/**
	 * When used with linear interpolation and a non-linear scale, this controls how many additional points the chart should use
	 * to interpolate the lines according to the scale.
	 * This is a millisecond value; the chart will add a point every mainChartNonLinearScaleInterpolationInterval milliseconds.
	 */
	var mainChartNonLinearScaleInterpolationInterval;

	/**
	 * The field name for the chart X field.
	 */
	var mainChartXField;

	/**
	 * The X scale for the main chart. This will be controlled by the selector.
	 */
	var mainChartXScale;

	/**
	 * The X scale for the selector. This will always contain the full X domain.
	 */
	var selectorXScale;

	/**
	 * The axis components and SVG groups for the main chart axes.
	 */
	var mainChartYAxis, mainChartXAxis, mainChartYAxisSVGGroup, mainChartXAxisSVGGroup;

	/**
	 * The axis components and SVG groups for the selector chart axus.
	 */
	var selectorXAxis, selectorXAxisSVGGroup;

	/**
	 * The selector brush component and brush SVG group
	 */
	var selectorBrush, selectorBrushSVGGroup;

	/**
	 * Controls how the selector brush behaves when data is updated.
	 * This variable may have the following values:
	 * - 'retain':		The selector brush never moves or resizes, unless an update causes it to go out of bounds, in which case it is clipped.
	 * - 'move':		The selector brush doesn't move or resize unless it touches either of the bound's edges.
	 *					In that case, it will try to move to retain its size. If the selector doesn't fit in the new bounds, it will be clipped.
	 * - 'extend':		The selector brush doesn't move, but if it touches either of the bound's edges it will resize itself
	 *					so it continues to touch that edge with the new bounds.
	 * - 'release':		The selector is removed whenever the bounds change.
	 */
	var selectorUpdatePolicy = 'move';

	/**
	 * Attempts the load the given serialized JSON property.
	 * If the property does not a valid JSON, this function will return the supplied defaultValue.
	 * @param name <String>						The property to load.
	 * {
	 *	@param withDefaultValue: <AnyObject>	The default value to return if the JSON cannot be parsed.
	 * }
	 * @return <Object or [], nullable>			The decoded object.
	 */
	this.loadJSONPropertyNamed = function (name, options) {
		try {
			return JSON.parse(chart.getProperty(name));
		}
		catch (error) {
			return options.withDefaultValue;
		}
	};

	/**
	 * Loads all main chart local variables from the properties
	 */
	this.mainChartInitializeProperties = function () {

		mainChartYFields = chart.loadJSONPropertyNamed('YFields', {withDefaultValue: []});
		mainChartXField = chart.getProperty('XField');

		mainChartColors = chart.loadJSONPropertyNamed('YFieldColors', {withDefaultValue: []});
		mainChartLabels = chart.loadJSONPropertyNamed('Labels', {withDefaultValue: []});
		mainChartStrokeWidths = chart.loadJSONPropertyNamed('StrokeWidths', {withDefaultValue: []});
		mainChartPatterns = chart.loadJSONPropertyNamed('Patterns', {withDefaultValue: []});

		mainChartShowsDataPoints = chart.getProperty('ShowDataPoints');
		mainChartShowsFills = chart.getProperty('Fill');

		mainChartDisplayConfigurationDefault.fill = mainChartShowsFills;
		mainChartDisplayConfigurationDefault.dataPoint = mainChartShowsDataPoints;
		mainChartDisplayConfigurationDefault.fillOpacity = chart.fillOpacity;
		mainChartDisplayConfigurationDefault.dataPointSize = chart.circleSize;

		selectorUpdatePolicy = chart.getProperty('RangeUpdateType');

		mainChartIsAdditive = chart.getProperty('Additive');
		if (mainChartIsAdditive) {
			sharedYAxis = YES;
		}

		mainChartScaleType = chart.getProperty('ScaleType');
		mainChartScaleFactor = chart.getProperty('ScaleFactor');

		if (mainChartScaleFactor == 'e') {
			mainChartScaleFactor = Math.E;
		}
		else if (mainChartScaleFactor == 'pi') {
			mainChartScaleFactor = Math.PI;
		}
		else {
			mainChartScaleFactor = parseFloat(mainChartScaleFactor);
			if (isNaN(mainChartScaleFactor)) {
				mainChartScaleFactor = 10;
			}
		}

		mainChartNonLinearScaleInterpolationInterval = chart.getProperty('NonLinearScaleInterpolationInterval');

		mainChartDisplayConfiguration = chart.getProperty('DisplayConfiguration');

		if (mainChartDisplayConfiguration) {
			try {
				mainChartDisplayConfiguration = JSON.parse(mainChartDisplayConfiguration);
				mainChartHasPerFieldConfiguration = YES;
			}
			catch (e) {
				// If the configuration is not valid, the chart will use the default behaviour of global display configuration
				mainChartDisplayConfiguration = [];
			}
		}

	};


	// MARK: Component generators

	/**
	 * Constructs and returns a new D3 scale component for the field at the specified index.
	 * @param i <Int>									The field index.
	 * {
	 *	@param ofType <String, nullable>				Defaults to 'linear'. May be 'linear', 'log', 'pow' or 'sqrt'. The type of scale.
	 *	@param factor <Number, nullable>				Required only for log and pow scales. For log scales this is the log base and for pow scales this is the exponent.
	 * 	@param forSelectorChart <Boolean, nullable>		Defaults to NO. If set to YES, this function will return the scale component for the selector chart.
	 * }
	 * @return <d3.line>								A D3 scale component.
	 */
	 this.mainChartCreateScaleComponentWithIndex = function (i, options) {
		options = options || {};

		var scale = d3.scale[options.ofType || 'linear']().range(options.forSelectorChart ? [chart.height2, 0] : [chart.height, 0]);

		if (options.ofType == 'pow') {
			scale.exponent(options.factor);
		}
		else if (options.ofType == 'log') {
			scale.base(options.factor);
		}

		return scale;
	 }

	/**
	 * Constructs and returns a new D3 line component for the field at the specified index.
	 * @param i <Int>									The field index.
	 * {
	 * 	@param forSelectorChart <Boolean, nullable>		Defaults to NO. If set to YES, this function will return the line component for the selector chart.
	 * }
	 * @return <d3.line>								A D3 line component.
	 */
	this.mainChartCreateLineComponentWithIndex = function (i, options) {
		options = options || {};

		// Line components use a Y function that returns the Y pixel value for each data point
		var yFunction;
		var yScales = options.forSelectorChart ? selectorYScales : mainChartYScales;

		if (mainChartIsAdditive) {
			// If the chart is additive, the Y function returns the scaled sum of the Y values of this field and all previous fields.
			yFunction = function (d) {
				var sum = d[mainChartYFields[i]];

				for (var j = 0; j < i; j++) {
					sum += d[mainChartYFields[j]] || 0;
				}

				return yScales[i](sum);
			}
		}
		else {
			// If the chart is not additive, the Y function just returns the scaled Y value
			yFunction = function (d) {
				return yScales[i](d[mainChartYFields[i]]);
			}
		}

		var line = d3.svg.line()
			    .interpolate(chart.interpolation)
			    .x(options.forSelectorChart ?
			    		function(d) { return selectorXScale(d[mainChartXField]); } :
			    		function(d) { return mainChartXScale(d[mainChartXField]); }
			    )
			    .y(yFunction);

		line.defined(function (d) {
			return !!d && !isNaN(yFunction(d));
		});


		return line;
	};

	/**
	 * Constructs and returns a new D3 area component for the field at the specified index.
	 * @param i <Int>									The field index.
	 * @return <d3.area>								A D3 line component.
	 */
	this.mainChartCreateAreaComponentWithIndex = function (i) {

		// The areas use two functions:
		// 	1. The floor or y0 function which gives the lower range of the fill
		// 	2. The ceiling or y1 function which gives the higher range of the fill
		var yFloorFunction, yCeilingFunction;

		if (mainChartIsAdditive) {
			// If the chart is additive, the Y function returns the scaled sum of the Y values of this field and all previous fields.
			yCeilingFunction = function (d) {
				var sum = d[mainChartYFields[i]];

				for (var j = 0; j < i; j++) {
					sum += d[mainChartYFields[j]] || 0;
				}

				return mainChartYScales[i](sum);
			}

			// The floor function is similar to the ceiling function, except that it doesn't include the current field's value.
			yFloorFunction = function (d) {
				if (i == 0) return chart.height;

				var sum = 0;

				for (var j = 0; j < i; j++) {
					sum += d[mainChartYFields[j]] || 0;
				}

				return mainChartYScales[i](sum);
			}
		}
		else {
			// If the chart is not additive, the Y ceiling function just returns the scaled Y value.
			yCeilingFunction = function (d) {
				return mainChartYScales[i](d[mainChartYFields[i]]);
			}

			// And the floor function directly returns the lowest pixel point in the chart.
			yFloorFunction = function (d) { return chart.height; };
		}


		var area = d3.svg.area()
			    .interpolate(chart.interpolation)
			    .x(function (d) { return mainChartXScale(d[mainChartXField]); })
			    .y0(yFloorFunction)
			    .y1(yCeilingFunction);

		area.defined(function (d) {
			return !!d && !isNaN(yCeilingFunction(d));
		});

		return area;
	};

	/**
	 * Constructs and returns a new D3 data point symbol component for the field at the specified index.
	 * @param i <Int>									The field index.
	 * @return <d3.symbol>								A D3 data point symbol component.
	 */
	this.mainChartCreateDataPointComponentWithIndex = function (i) {
		var config = mainChartDisplayConfiguration[i] || mainChartDisplayConfigurationDefault;
		return d3.svg.symbol().type(config.dataPointShape || 'circle').size(config.dataPointSize || circleSize);
	};


	// MARK: SVG Generators

	/**
	 * Constructs and returns a new SVG group for the field at the specified index. The group will be appended to the main SVG
	 * @param i <Int>										The field index.
	 * {
	 *  @param className <String>							The class to assign to the group.
	 *	@param duplicateIndexedClass <Boolean, nullable>	Defaults to NO. If set to YES, the selected class will also be applied with the suffixed index.
	 * 	@param forSelectorChart <Boolean, nullable>			Defaults to NO. If set to YES, this function will return the line component for the selector chart.
	 * }
	 * @return <d3.select>									A D3 selection containing the new group.
	 */
	this.mainChartCreateSVGGroupWithIndex = function (i, options) {
		var className = options.className;
		if (options.duplicateIndexedClass) className += ' ' + className + i;

		var leftMargin = options.forSelectorChart ? chart.margin2.left : chart.margin.left;
		var topMargin = options.forSelectorChart ? chart.margin2.top : chart.margin.top;

		var group = chart.svg.append("g")
			    .attr('class', className)
			    .attr('transform', 'translate(' + leftMargin + ', ' + topMargin + ')')
			    .attr('clip-path', 'url(#clip-' + chart.jqElementId + ')');
			    
		// TODO: actually not create useless groups when using secondary chart only
		if (secondaryChartOnly) {
			group.style('display', 'none');
		}

		return group;
	};

	/**
	 * Constructs and returns a new SVG group for the hover components of a given type.
	 * The hover type can be either for the main chart, the time or a threshold.
	 * @param type <String>					The type of component to which these hover elements apply. Must be one of 'time', 'chart', 'threshold' or 'timeline'
	 * {
	 *	@param withIndex <Int, nullable>	Required for main chart and threshold hover components. The index of the field or threshold to which these hover elements apply.
	 * }
	 * @return <d3.select>					A D3 selection containing the new group.
	 */
	this.mainChartCreateSVGComponentsForHoverOfType = function (type, options) {
		var suffix = type == 'chart' ? options.withIndex : 'Timestamp';

		if (type == 'threshold') {
			suffix = 'Threshold' + options.withIndex;
		}
		else if (type == 'timeline') {
			suffix = 'Timeline';
		}

		// Construct the container group
		var group = chart.svg.append("g")
					    .attr("class", "hoverCircle hoverCircle" + suffix)
					    .style("display", "none")
						.style("pointer-events", "none");

		var color = 'gray';

		if (type == 'chart') {
			color = mainChartColors[options.withIndex] || chart.defaultColors[options.withIndex];
		}
		else if (type == 'threshold') {
			color = thresholds[options.withIndex].color || chart.defaultColors[options.withIndex];
		}
		else if (type == 'timeline') {
			color = 'white';
		}

		// Construct the hover circle indicator
		group.append("circle")
		    .attr("r", 4.5)
			.style("fill", "#FFF")
			.style("stroke-width", 2)
			.attr("filter", "url(#" + chart.jqElementId + "labelshadow)")
			.style("stroke", color);

		// Construct the tooltip background
		group.append("rect")
			.attr("class", "overlayBorder")
			.attr("filter", "url(#" + chart.jqElementId + "labelshadow)")
			.attr("width", 30)
			.attr("height", 24)
			.attr("rx", 4)
			.attr("ry", 4)
			.attr("x", 8)
			.attr("y", -14);

		// Construct the tooltip text
		group.append("text")
	    	.attr("class", "overlayText")
			.style("font-family", "'Open Sans'")
			.style("font-size", "14")
			.style("fill", "#555555")
		    .attr("x", 14)
		    .attr("dy", ".35em");

		return group;

	};


	/**
	 * Constructs the initial components for the main and selector charts.
	 */
	this.mainChartCreateComponents = function () {
		// Construct the X scales; these only need to be constructed once
		mainChartXScale = d3.time.scale().range([0, chart.width]);
		selectorXScale = d3.time.scale().range([0, chart.width]);

		// Initialize the area and data point component arrays if they are needed
		if (mainChartShowsFills || mainChartHasPerFieldConfiguration) {
			mainChartAreaComponents = [];
			mainChartAreaSVGGroups = [];
		}
		if (mainChartShowsDataPoints || mainChartHasPerFieldConfiguration) {
			mainChartDataPointComponents = [];
			mainChartDataPointSVGGroups = [];
		}

		// Initialize the selector arrays and brush components if they are needed
		if (showsSelector) {
			selectorYScales = [];
			selectorLineComponents = [];
			selectorLineSVGGroups = [];
		}

		// Construct the X axis components and SVG groups; these only need to be constructed once
		mainChartXAxis = d3.svg.axis().scale(mainChartXScale).orient("bottom").ticks(chart.getProperty("XTicks"));
	    selectorXAxis = d3.svg.axis().scale(selectorXScale).orient("bottom").ticks(chart.getProperty("XTicks"));

		if (timeFormat) {
			mainChartXAxis.tickFormat(d3.time.format(timeFormat));
			selectorXAxis.tickFormat(d3.time.format(timeFormat));
		}

		// X axis SVG groups
		mainChartXAxisSVGGroup = chart.svg.append("g")
			.attr("class", "x axis axis0")
			.style("font-family", "'Open Sans'")
			.style("font-size", (xAxisStyle && xAxisStyle.textSize) || "14")
			.attr("transform", "translate(" + chart.margin.left + ", " + (chart.margin.top + chart.height) + ")");

		selectorXAxisSVGGroup = chart.svg.append("g")
			.attr("class", "x axis axis2")
			.style("font-family", "'Open Sans'")
			.style("font-size", (xAxisStyle && xAxisStyle.textSize) || "14")
			.attr("transform", "translate(" + chart.margin.left + ", " + (chart.margin2.top + chart.height2) + ")");

		// Y axis component and group
		if (sharedYAxis) {
			mainChartYAxis = d3.svg.axis().orient('left');
		}
		else {
			mainChartYAxis = d3.svg.axis().scale(d3.scale.linear().range([chart.height, 0]).domain([0, 1]));
		}

		mainChartYAxis.orient("left")
		    .ticks(chart.getProperty('YTicks'))
		    .tickFormat(function(d) {
				var format = axisFormat || numberFormat;

			    if (sharedYAxis) {
				    return format ? d.format(format) : d.toFixed();
			    }
			    else {
			    	var percent = d;
			    	var text = "";
			    	for (var j = 0; j < mainChartYFields.length; j++) {
			    		var domain = mainChartYScales[j].domain();
			    		var domainLength = domain[1] - domain[0];
						if (format) {
							text += (domain[0] + domainLength * percent).format(format) + "|";
						}
						else {
				    		text += (domain[0] + domainLength * percent).toFixed() + "|";
						}
			    	}
			    	return text;
			    }
			});

		// Y axis SVG group
		mainChartYAxisSVGGroup = chart.svg.append("g")
						.attr("class", "y axis axis1")
						.style("font-family", "'Open Sans'")
						.style("font-size", (yAxisStyle && yAxisStyle.textSize) || "14")
						.attr("transform", "translate(" + chart.margin.left + "," + chart.margin.top + ")");
						
		// Hide the Y axis group if the Y axis is not visible
		// TODO: actually not draw the Y axis in this case
		if (!chart.getProperty('ShowsYAxis')) {
			mainChartYAxisSVGGroup.style('display', 'none');
		}

		// Construct the brush components; these only need to be constructed once
		selectorBrush = d3.svg.brush().x(selectorXScale).on('brush', chart.mainChartBrushExtentDidChange);

		// Construct the initial components; they are used in animations whenever a field is added or removed
		// Added lines animate from the initial components, while removed lines animate to the initial components.
		mainChartLineInitialComponent = d3.svg.line()
			    .interpolate(chart.interpolation)
			    .x(function(d) { return mainChartXScale(d[mainChartXField]); })
			    .y(function(d) { return chart.height; });

		selectorLineInitialComponent = d3.svg.line()
			    .interpolate(chart.interpolation)
			    .x(function(d) { return selectorXScale(d[mainChartXField]); })
			    .y(function(d) { return chart.height2; });

		if (mainChartShowsFills || mainChartHasPerFieldConfiguration) mainChartAreaInitialComponent = d3.svg.area()
			    .interpolate(chart.interpolation)
			    .x(function(d) { return mainChartXScale(d[mainChartXField]); })
			    .y0(function(d) { return chart.height; })
			    .y1(function(d) { return chart.height; });

		// Create all the Y field-dependent components
		this.mainChartCreateComponentsWithStartIndex(0, {endIndex: mainChartYFields.length});

		// Create the time hover SVG elements, if they are needed
		if (showsTimestamp) {
			mainChartTimestampSVGHoverGroup = this.mainChartCreateSVGComponentsForHoverOfType('time');
		}

		// Construct the selector brush SVG group and elements
		if (showsSelector) {
			selectorBrushSVGGroup = chart.svg.append("g")
					.attr("class", "x brush")
					.attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin2.top + ')');

			selectorBrushSVGGroup.call(selectorBrush)
						.selectAll('rect')
							.attr("y", -6)
							.attr("rx", 4)
							.attr("ry", 4)
							.attr("height", chart.height2 + 7);
		}
		
		
			    
		// TODO: actually not create useless groups when using secondary chart only
		if (secondaryChartOnly) {
			mainChartXAxisSVGGroup.style('display', 'none');
			mainChartYAxisSVGGroup.style('display', 'none');
			selectorXAxisSVGGroup.style('display', 'none');
		}

	};

	/**
	 * Constructs the initial components for the main and selector charts for the fields in the given index range.
	 * @param startIndex <Int>							The index at which to start.
	 * {
	 *	@param endIndex <Int, nullable>					Defaults to the number of Y fields. The end index will not be included in the range.
	 *	@param withConfiguration <Object, nullable>		Defaults to the configuration for each field. The configuration to use when creating these components.
	 *	@param newField <Boolean, nullable>				Defaults to YES. If set to YES, this will create the scale, hover and selector components. This will also
	 *													cause chart components such as hover groups and thresholds to be brought to the front.
	 * }
	 */
	this.mainChartCreateComponentsWithStartIndex = function (startIndex, options) {
		options = options || {};
		var endIndex = isNaN(options.endIndex) ? mainChartYFields.length : options.endIndex;
		if (options.newField === undefined) options.newField = YES;


		for (var i = startIndex; i < endIndex; i++) {
			var configuration = options.withConfiguration || mainChartDisplayConfiguration[i] || mainChartDisplayConfigurationDefault;

			// Construct the Y scales
			if (options.newField) mainChartYScales[i] = chart.mainChartCreateScaleComponentWithIndex(i, {ofType: mainChartScaleType, factor: mainChartScaleFactor});

			// Construct the line components
			if (configuration.line) {
				mainChartLineComponents[i] = chart.mainChartCreateLineComponentWithIndex(i);
				mainChartLineSVGGroups[i] = chart.mainChartCreateSVGGroupWithIndex(i, {className: 'focus', duplicateIndexedClass: YES});
			}

			if (options.newField) mainChartHoverSVGGroups[i] = chart.mainChartCreateSVGComponentsForHoverOfType('chart', {withIndex: i});

			// Construct the area components, if they are needed
			if (configuration.fill) {
				mainChartAreaComponents[i] = chart.mainChartCreateAreaComponentWithIndex(i);
				mainChartAreaSVGGroups[i] = chart.mainChartCreateSVGGroupWithIndex(i, {className: 'focusFills', duplicateIndexedClass: YES});
			}

			// Construct the data point components, if they are needed
			if (configuration.dataPoint) {
				mainChartDataPointComponents[i] = chart.mainChartCreateDataPointComponentWithIndex(i);
				mainChartDataPointSVGGroups[i] = chart.mainChartCreateSVGGroupWithIndex(i, {className: 'circle', duplicateIndexedClass: YES});
			}


			// Construct the selector components, if they are needed
			if (options.newField && showsSelector) {
				selectorYScales[i] = chart.mainChartCreateScaleComponentWithIndex(i, {ofType: mainChartScaleType, factor: mainChartScaleFactor, forSelectorChart: YES});
				selectorLineComponents[i] = chart.mainChartCreateLineComponentWithIndex(i, {forSelectorChart: YES});
				selectorLineSVGGroups[i] = chart.mainChartCreateSVGGroupWithIndex(i, {className: 'context', duplicateIndexedClass: YES, forSelectorChart: YES});
			}

		}

		// Whenever any components are created, the brush, event overlays and tooltip groups must be brought to the front
		if (options.newField) chart.mainChartBringComponentsToFront();
	};


	/**
	 * Updates the configuration for the field at the given index.
	 * This will add or remove SVG groups depending on the differences between the new and the old configurations.
	 * @param index <Int>						The field's index.
	 * {
	 *	@param fromConfiguration <Object>		The previous configuration.
	 *	@param toConfiguration <Object>			The new configuration.
	 * }
	 */
	this.mainChartUpdateConfigurationForFieldAtIndex = function (index, options) {
		var prev = options.fromConfiguration;
		var next = options.toConfiguration;

		// The two configurations will be split into two additional configurations
		// The added configuration will contain the display options added in the new configuration
		// The removed configuration will contain the display options removed in the new configuration
		var addedConfiguration = {};
		var removedConfiguration = {};

		// Line components
		if (next.line != prev.line) {
			if (next.line) {
				addedConfiguration.line = YES;
			}
			else {
				removedConfiguration.line = YES;
			}
		}

		if (next.fill != prev.fill) {
			if (next.fill) {
				addedConfiguration.fill = YES;
			}
			else {
				removedConfiguration.fill = YES;
			}
		}

		if (next.dataPoint != prev.dataPoint) {
			if (next.dataPoint) {
				addedConfiguration.dataPoint = YES;
			}
			else {
				removedConfiguration.dataPoint = YES;
			}
		}
		else {
			// For data points, update the generator properties as well.
			if (next.dataPoint) mainChartDataPointComponents[index].type(next.dataPointShape || 'circle').size(next.dataPointSize || circleSize);
		}

		chart.mainChartCreateComponentsWithStartIndex(index, {endIndex: index + 1, withConfiguration: addedConfiguration, newField: NO});
		chart.mainChartRemoveComponentsAtIndex(index, {withConfiguration: removedConfiguration, animated: animationsEnabled});
	};

	/**
	 * Removes configuration specific components from the field at the given index.
	 * @param index <Int>								The field's index.
	 * {
	 *	@param withConfiguration <Object, nullable>		Defaults to the field's configuration. The field's configuration.
	 *	@param animated <Boolean, nullable>				Defaults to NO. If set to YES, this change will be animated.
	 * }
	 */
	this.mainChartRemoveComponentsAtIndex = function (index, options) {
		options = options || {};
		var config = options.withConfiguration || mainChartDisplayConfiguration[index] || mainChartDisplayConfigurationDefault;

		if (config.line) {
			chart.mainChartRemoveGroup(mainChartLineSVGGroups[index], {ofType: 'line', withFinalComponent: mainChartLineInitialComponent, animated: options.animated});
			mainChartLineSVGGroups[index] = undefined;
			mainChartLineComponents[index] = undefined;
		}

		if (config.fill) {
			chart.mainChartRemoveGroup(mainChartAreaSVGGroups[index], {ofType: 'area', withFinalComponent: mainChartAreaInitialComponent, animated: options.animated});
			mainChartAreaSVGGroups[index] = undefined;
			mainChartAreaComponents[index] = undefined;
		}

		if (config.dataPoint) {
			chart.mainChartRemoveGroup(mainChartDataPointSVGGroups[index], {ofType: 'dataPoint', animated: options.animated});
			mainChartDataPointSVGGroups[index] = undefined;
			mainChartDataPointComponents[index] = undefined;
		}
	};


	/**
	 * Brings back to the front all components that overlay other elements such as hover components and the brush
	 */
	this.mainChartBringComponentsToFront = function () {
		function bringToFront() {
			this.parentNode.appendChild(this);
		};

		if (showsThresholds) {
			for (var i = 0; i < thresholds.length; i++) {
				if (thresholdLineSVGGroups[i]) thresholdLineSVGGroups[i].each(bringToFront);
			}
		}

		if (selectorBrushSVGGroup) {
			selectorBrushSVGGroup.each(bringToFront);
		}

		for (var i = 0; i < mainChartYFields.length; i++) {
			mainChartHoverSVGGroups[i].each(bringToFront);
		}

		if (eventHandlerSVGOverlay) eventHandlerSVGOverlay.each(bringToFront);

		if (mainChartTimestampSVGHoverGroup) {
			mainChartTimestampSVGHoverGroup.each(bringToFront);
		}

		if (showsThresholds) {
			for (var i = 0; i < thresholds.length; i++) {
				if (thresholdHoverSVGGroups[i]) thresholdHoverSVGGroups[i].each(bringToFront);
			}
		}
	};


	/**
	 * Removes a SVG group from the chart.
	 * @param group <d3.select>								The D3 selection containing the group.
	 * {
	 *	@param ofType <String>								The group's type. Must be 'line', 'area' or 'dataPoint'.
	 *	@param withFinalComponent <d3.generator, nullable>	Required for lines and areas when animated. The D3 generator that will provide the final path shape.
	 *	@param animated <Boolean, nullable>					Defaults to NO. If set to YES, the removal will be animated.
	 * }
	 */
	this.mainChartRemoveGroup = function (group, options) {
		if (!options.animated || !chart.data) {
			group.remove();
			return;
		}

		var finished = NO;

		if (options.ofType == 'line' || options.ofType == 'area') {
			var path = group.select('path');
			if (!path) {
				group.remove();
				return;
			}

			var pathTransition = path.transition().duration(animationDuration)
				.attr('d', options.withFinalComponent(chart.data));

			if (options.ofType == 'line') pathTransition.style('stroke-opacity', 1e-6)
			if (options.ofType == 'area') pathTransition.style('fill-opacity', 1e-6)

			pathTransition.each('end', function () {
				if (finished) return;
				finished = YES;

				group.remove();
			});
		}
		else if (options.ofType == 'dataPoint') {
			var dataPointSelection = group.selectAll('path').data(chart.data, function (d) { return d[mainChartXField]; });

			dataPointSelection.transition().duration(animationDuration)
				.style('fill-opacity', 1e-6)
				.attr('transform', function (d) {
					return "translate(" + mainChartXScale(d[mainChartXField]) + "," + chart.height + ")";
				})
				.each('end', function () {
					if (finished) return;
					finished = YES;

					group.remove();
				});
		}
	}

	/**
	 * Removes count components from the end of all component arrays.
	 * SVG groups will also be removed from the DOM.
	 * @param count <Int>						The number of elements to remove.
	 * {
	 *	@param animated <Boolean, nullable>		Defaults to NO. If set to YES, groups will be removed with an animation, otherwise they will be removed instantly.
	 * }
	 */
	this.mainChartTruncateFinalComponentsWithCount = function (count, options) {
		options = options || {};

		var animated = options.animated;

		var newCount = mainChartYFields.length - count;
		var oldCount = mainChartYFields.length;

		// Remove the SVG components
		for (var i = newCount; i < oldCount; i++) {
			var config = mainChartDisplayConfiguration[i] || mainChartDisplayConfigurationDefault;

			if (config.line) {
				chart.mainChartRemoveGroup(mainChartLineSVGGroups[i], {ofType: 'line', withFinalComponent: mainChartLineInitialComponent, animated: options.animated});
			}

			if (config.fill) {
				chart.mainChartRemoveGroup(mainChartAreaSVGGroups[i], {ofType: 'area', withFinalComponent: mainChartAreaInitialComponent, animated: options.animated});
			}

			if (config.dataPoint) {
				chart.mainChartRemoveGroup(mainChartDataPointSVGGroups[i], {ofType: 'dataPoint', animated: options.animated});
			}

			if (showsSelector) {
				chart.mainChartRemoveGroup(selectorLineSVGGroups[i], {ofType: 'line', withFinalComponent: selectorLineInitialComponent, animated: options.animated});
			}

			mainChartHoverSVGGroups[i].remove();

		}

		// Truncate the arrays
		mainChartYScales.length = newCount;
		mainChartLineComponents.length = newCount;
		mainChartLineSVGGroups.length = newCount;
		mainChartHoverSVGGroups.length = newCount;

		//if (mainChartShowsFills) {
		mainChartAreaComponents.length = newCount;
		mainChartAreaSVGGroups.length = newCount;
		//}
		//if (mainChartShowsDataPoints) {
		mainChartDataPointComponents.length = newCount;
		mainChartDataPointSVGGroups.length = newCount;
		//}

		if (showsSelector) {
			selectorYScales.length = newCount;
			selectorLineComponents.length = newCount;
			selectorLineSVGGroups.length = newCount;
		}


	};

	/**
	 * Updates or creates the path in the given group to a new data set.
	 * @param group <d3.select>								The D3 selection with the container group.
	 * {
	 *	@param ofType <String, nullable>					Defaults to 'line'. Can be set to 'area', in which case the path will be treated as an area fill.
	 *	@param toData <[AnyObject]>							The new data set.
	 *	@param usingGenerator <d3.generator>				The D3 component that will generate the path's points.
	 *	@param initialGenerator <d3.generator, nullable>	Required if animations are enabled and the path has to be created.
	 *														The D3 component that will generate the path's initial points.
	 *	@param color <String>								The color to assign when creating a new path.
	 *	@param strokeWidth <String, nullable>				Required for line paths. The stroke width to assign when creating a new path.
	 *	@param pattern <String, nullable>					Required for line paths. The pattern to assign when creating a new path.
	 * 	@param areaOpacity <Number, nullable>				Required for area paths. The fill opacity.
	 * 	@param className <String>							The class names to assign when creating a new path.
	 *	@param updateProperties <Boolean, nullable>			Defaults to NO. If set to YES, the properties will also be applied if the path already exists.
	 *														Otherwise, all non-data properties are only applied if the path has to be created.
	 *	@param animated <Boolean, nullable>					Defaults to NO. If set to YES, the update will be animated.
	 * }
	 */
	this.mainChartUpdatePathInGroup = function (group, options) {
		var updateProperties = options.updateProperties || NO;

		/**
		 * Encapsulates the property update code, since it may be invoked from multiple points/
		 */
		var updatePropertiesWithPathSelection = function (pathSelection) {

			pathSelection.attr('class', options.className);

			// Depending on the type, apply the stroke or fill styles
			if (options.ofType == 'area') {
				pathSelection.style('fill', options.color)
					.style('fill-opacity', options.areaOpacity);
			}
			else {
				pathSelection.style('stroke', options.color)
					.style('stroke-width', options.strokeWidth)
					.style('stroke-dasharray', options.pattern);
			}

		};

		var pathSelection = group.select('path');

		// Construct the path if it doesn't already exist
		if (pathSelection.empty()) {
			pathSelection = group.append('path');

			// If the path has to be created, the properties will be set regardless of whether updateProperties was set to NO or not.
			updatePropertiesWithPathSelection(pathSelection);
			updateProperties = NO;

			if (options.animated) {
				// If animated, the new path will animate from an initial shape
				pathSelection.attr('d', options.initialGenerator(options.toData));

				// If animated, the path will animate from an opacity of 0
				if (options.ofType == 'area') {
					pathSelection.style('fill-opacity', 1e-6);
				}
				else {
					pathSelection.style('stroke-opacity', 1e-6);
				}
			}

		}

		// Apply the new data and the new opacities
		if (options.animated) {
			pathSelection = pathSelection.transition().duration(animationDuration)
				.attr('d', options.usingGenerator(options.toData));

			if (options.ofType == 'area') {
				pathSelection.style('fill-opacity', options.areaOpacity);
			}
			else {
				pathSelection.style('stroke-opacity', 1);
			}
		}
		else {
			pathSelection.attr('d', options.usingGenerator(options.toData));
		}

		// Finally, apply the properties if needed.
		// If this change should be animated, pathSelection will already refer to a transition at this point.
		if (updateProperties) updatePropertiesWithPathSelection(pathSelection);

	};

	/**
	 * Should be invoked for non-linear scales to find the ticks to add to the Y axis.
	 * @param domain <[Date or Number, Date or Number]>		The domain for which to find the ticks.
	 * @return <[Number]>									An array of values to display on the Y axis.
	 */
	this.mainChartFindYTicksForDomain = function (domain) {

	};

	/**
	 * Updates the main chart and selector chart with the given data.
	 * @param data <[AnyObject]>							The data, as an array of values.
	 * {
	 *	@param fromData <[AnyObject], nullable>				The previous data set, if it is available.
	 *	@param compactData <[AnyObject], nullable>			When using non-linear scales, this should contain the data without the added points.
	 *	@param reapplyProperties <Boolean, nullable> 		Defaults to NO. If set to YES, the style attributes will be reapplied to existing paths.
	 *	@param reapplyDataPoints <Boolean, nullable>		Defaults to NO. If set to YES, the data point shapes will be recreated.
	 *	@param animated <Boolean, nullable>					Defaults to NO. If set to YES, the update will be animated.
	 * }
	 */
	this.mainChartUpdateToData = function (data, options) {
		options = options || {};
		var animated = options.animated;
		var oldData = options.fromData;
		var reapplyProperties = options.reapplyProperties;

		var brushExtent = selectorBrush.extent();
		brushExtent = [+brushExtent[0], +brushExtent[1]];
		var isBrushEmpty = selectorBrush.empty();

		// update the global x scale
		var oldXDomain = selectorXScale.domain();
		if (oldXDomain) oldXDomain = [+oldXDomain[0], +oldXDomain[1]];

		var newXDomain = d3.extent(data.map(function (d) { return d[mainChartXField]; }));
		selectorXScale.domain(newXDomain);
		newXDomain = [+newXDomain[0], +newXDomain[1]];

		// If there is no brush extent, there is no selection and no update is required
		if (!isBrushEmpty) {

			// Update the brush and main chart X scale domain depending on the brush update policy
			if (oldXDomain) {
				// The retain case is not treated here; it simply indicates that the selector should try to keep its old extents

				if (selectorUpdatePolicy == 'extend') {
					// Indicates that the selector should extend to the new domain
					// only when it was extended to an edge of the old domain
					if (brushExtent[0] == oldXDomain[0]) brushExtent[0] = newXDomain[0];
					if (brushExtent[1] == oldXDomain[1]) brushExtent[1] = newXDomain[1];
				}
				else if (selectorUpdatePolicy == 'move') {
					// Indicates that the selector should move towards one of the edges of the new domain
					// only when it was extended to the same edge of the old domain

					// If the brush touches both of the edges of the old domain, it should favor going towards the end of the new domain
					if (brushExtent[1] == oldXDomain[1]) {
						var intervalDifference = newXDomain[1] - oldXDomain[1];
						brushExtent[1] += intervalDifference;
						brushExtent[0] += intervalDifference;
					}
					else if (brushExtent[0] == oldXDomain[0]) {
						var intervalDifference = newXDomain[0] - oldXDomain[0];
						brushExtent[1] += intervalDifference;
						brushExtent[0] += intervalDifference;
					}
				}
				else if (selectorUpdatePolicy == 'release') {
					// Indicates that the selector should always select the entire range no matter what
					brushExtent[1] = newXDomain[1];
					brushExtent[0] = newXDomain[0];

					// This will cause the x scale to select the entire range and the brush to be cleared.
					isBrushEmpty = YES;
				}
			}

			// No matter the update type, the brush extent is not allowed to exceed the new global x domain
			if (brushExtent[0] < newXDomain[0]) brushExtent[0] = newXDomain[0];
			if (brushExtent[1] > newXDomain[1]) brushExtent[1] = newXDomain[1];

			// If the update policy causes the brush to become inverted or appear outside the selectable area, it should be cleared
			if (brushExtent[0] > brushExtent[1] || brushExtent[0] > newXDomain[1] || brushExtent[1] < newXDomain[0]) {
				isBrushEmpty = YES;
			}
		}

		// Apply the newly computed brush extent to the main chart x scale as well. If there was no brush extent, use the entire domain
		var xScaleDomain = brushExtent;
		if (isBrushEmpty) {
			xScaleDomain = newXDomain;
		}

		mainChartXScale.domain(xScaleDomain);

		// Update the brush display
		if (showsSelector) {
			// Update the brush object
			if (!isBrushEmpty) {
				selectorBrush.extent(brushExtent);

				// Publish the updated ranges
				var blocksRangeUpdates = chart.blocksRangeUpdates;
				chart.blocksRangeUpdates = YES;

				chart.setProperty('RangeStart', brushExtent[0]);
				chart.setProperty('RangeEnd', brushExtent[1]);

				chart.blocksRangeUpdates = blocksRangeUpdates;
			}
			else {
				selectorBrush.clear();

				// Publish the updated ranges
				var blocksRangeUpdates = chart.blocksRangeUpdates;
				chart.blocksRangeUpdates = YES;

				chart.setProperty('RangeStart', newXDomain[0]);
				chart.setProperty('RangeEnd', newXDomain[1]);

				chart.blocksRangeUpdates = blocksRangeUpdates;
			}

			// Update the brush UI
			if (animated && oldData) {
				selectorBrushSVGGroup.transition().duration(animationDuration).call(selectorBrush);
			}
			else {
				selectorBrushSVGGroup.call(selectorBrush);
			}
		}

		// Update the y scales
		var totalMax = undefined;
		var totalMin = undefined;

		var maxSum = 0;

		// Compute the per-field minimums and maximums and the total maximum
		for (var i = 0; i < mainChartYFields.length; i++) {
			var max = d3.max(data.map(function(d) {
					var result = d[mainChartYFields[i]];
					return result;
				}
			));

			var min = d3.min(data.map(function(d) {
					var result = d[mainChartYFields[i]];
					return result;
				}
			));

			if (mainChartIsAdditive) {
				maxSum += max;
			}

			var interval = max - min;

			max = maxValue != -1 ? maxValue : max;
			min = minValue != - 1 ? minValue : min;

			if (max == min) {
				max = max + Math.abs(max) * 0.01;
				min = min - Math.abs(min) * 0.01;
			}


			if (totalMax == undefined || totalMax < max) totalMax = max;
			if (totalMin == undefined || totalMin > min) totalMin = min;

			if (!sharedYAxis) {
				mainChartYScales[i].domain([min, max]);
				if (showsSelector) selectorYScales[i].domain(mainChartYScales[i].domain());
			}
		}

		if (mainChartIsAdditive) {
			totalMax = maxSum;
		}

		// Handle the cases where the domain is 0
		if (totalMax == totalMin) {
			totalMax = totalMax + Math.abs(totalMax) * 0.01;
			totalMin = totalMin - Math.abs(totalMin) * 0.01;
		}

		if (sharedYAxis) {
			for (var i = 0; i < mainChartYFields.length; i++) {
				mainChartYScales[i].domain([totalMin, totalMax]);
				if (showsSelector) selectorYScales[i].domain(mainChartYScales[i].domain());
			}

			if (mainChartYFields.length) mainChartYAxis.scale(mainChartYScales[0]);
		}

		// Update the X and Y axes
		if (animated && options.fromData && options.fromData !== data) {
			mainChartXAxisSVGGroup.transition().duration(animationDuration).call(mainChartXAxis);
			if (sharedYAxis) mainChartYAxisSVGGroup.transition().duration(animationDuration).attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin.top + ')').call(mainChartYAxis);

			if (showsSelector) selectorXAxisSVGGroup.transition().duration(animationDuration).call(selectorXAxis);
		}
		else {
			mainChartXAxisSVGGroup.call(mainChartXAxis);
			if (sharedYAxis) mainChartYAxisSVGGroup.call(mainChartYAxis);

			if (showsSelector) selectorXAxisSVGGroup.call(selectorXAxis);
		}

		if (!sharedYAxis) {
			mainChartYAxis.scale(d3.scale.linear().range([chart.height, 0]).domain([0, 1]));
			mainChartYAxisSVGGroup.call(mainChartYAxis);
			mainChartYAxisSVGGroup.selectAll('text')
					.each(function (d) {
						try {
						    var el = d3.select(this);
						    var words = el.text().split('|');

						    if (words.length == 2) {
							    el.text(words[0]);
							    return;
							}

							//console.log("text is " + el.text());
						    el.text('');

						    for (var i = 0; i < words.length - 1; i++) {
						        var tspan = el.append('tspan').text(words[i]);
						        if (i > 0) {
						            tspan.attr('x', -9).attr('dy', words.length > 1 ? 15 : 0);
						        }
						        else {
						            tspan.attr('dy', - (words.length - 1.5) * 15 / 4);
						        }

						        tspan.style("fill", mainChartColors[i] || chart.defaultColors[i]);
						    }
						}
						catch (e) {}
					});
		}

		// Update or create the lines, area fills and data points, depending on whether they already exist or not
		var mainChartYFieldCount = mainChartYFields.length;
		for (var i = 0; i < mainChartYFieldCount; i++) {
			var config = mainChartDisplayConfiguration[i] || mainChartDisplayConfigurationDefault;

			// Update the main chart lines
			if (config.line) {
				chart.mainChartUpdatePathInGroup(mainChartLineSVGGroups[i], {
					toData: 			data,
					usingGenerator: 	mainChartLineComponents[i],
					initialGenerator: 	mainChartLineInitialComponent,
					color: 				mainChartColors[i] || chart.defaultColors[i],
					strokeWidth: 		mainChartStrokeWidths[i] || 2,
					pattern: 			mainChartPatterns[i] || '',
					className: 			'area bigArea area' + i,
					updateProperties:	reapplyProperties,
					animated: 			animated
				});
			}

			// Update the selector chart lines if it is enabled
			if (showsSelector) {
				chart.mainChartUpdatePathInGroup(selectorLineSVGGroups[i], {
					toData: 			data,
					usingGenerator: 	selectorLineComponents[i],
					initialGenerator: 	selectorLineInitialComponent,
					color: 				mainChartColors[i] || chart.defaultColors[i],
					strokeWidth: 		1,
					pattern: 			mainChartPatterns[i] || '',
					className: 			"area smallArea area" + i,
					updateProperties:	reapplyProperties,
					animated: 			animated
				});
			}

			// Update the main chart fills if they are enabled
			if (config.fill) {
				chart.mainChartUpdatePathInGroup(mainChartAreaSVGGroups[i], {
					ofType:				'area',
					toData: 			data,
					usingGenerator: 	mainChartAreaComponents[i],
					initialGenerator: 	mainChartAreaInitialComponent,
					color: 				mainChartColors[i] || chart.defaultColors[i],
					areaOpacity:		config.fillOpacity === undefined ? chart.fillOpacity : config.fillOpacity,
					className: 			'fill fill' + i,
					updateProperties:	reapplyProperties,
					animated: 			animated
				});
			}

			// Update the main chart data points if they are enabled
			if (config.dataPoint) {
				var dataPointSelection = mainChartDataPointSVGGroups[i].selectAll('path').data(options.compactData || data, function (d) { return d[mainChartXField]; });

				// Create the new data points
				var newDataPoints = dataPointSelection.enter().append('path')
					.attr('class', 'dataPoint dataPoint' + i)
					.attr('d', mainChartDataPointComponents[i]);

				if (config.dataPointStyle == 'stroke') {
					newDataPoints.style('stroke', mainChartColors[i] || chart.defaultColors[i])
						.style('stroke-width', 2)
						.style('stroke-opacity', 1e-6)
						.style('fill', 'none');
				}
				else {
					newDataPoints.style('fill', mainChartColors[i] || chart.defaultColors[i])
						.style('fill-opacity', 1e-6)
						.style('stroke', 'none');
				}

				newDataPoints.attr('transform', (function (d) {
						return "translate(" + mainChartXScale(d[mainChartXField]) + "," + chart.height + ")";
					}));

				// Destroy the old data points
				dataPointSelection.exit()
					.transition().duration(animationDuration)
					.style('fill-opacity', 1e-6)
					.style('stroke-opacity', 1e-6)
					.remove();

				// Update the updating and new data points
				var dataPointTransition = dataPointSelection.transition().duration(animationDuration);

				if (config.dataPointStyle == 'stroke') {
					dataPointTransition.style('stroke-opacity', 1);
					if (options.reapplyProperties) dataPointTransition.style('fill', 'none')
						.style('fill-opacity', 0)
						.style('stroke', mainChartColors[i] || chart.defaultColors[i]);
				}
				else {
					dataPointTransition.style('fill-opacity', 1);
					if (options.reapplyProperties) dataPointTransition.style('stroke', 'none')
						.style('stroke-width', 0)
						.style('stroke-opacity', null)
						.style('fill', mainChartColors[i] || chart.defaultColors[i]);
				}

				if (options.reapplyDataPoints) {
					dataPointTransition.attr('d', mainChartDataPointComponents[i]);
				}

				dataPointTransition.attr('transform', (function (i) { return function (d) {
						var yValue = d[mainChartYFields[i]];

						if (mainChartIsAdditive) {
							for (var j = 0; j < i; j++) {
								yValue += d[mainChartYFields[j]] || 0;
							}
						}

						// Convert the domain value to pixel value
						yValue = mainChartYScales[i](yValue);

						return "translate(" + mainChartXScale(d[mainChartXField]) + "," + yValue + ")";
					} })(i));
			}

		}

	};


	/**
	 * Invoked by D3 when the user moves or resizes the brush.
	 * This function will be invoked on the global context.
	 */
	this.mainChartBrushExtentDidChange = function () {
		chart.mainChartBrushApplyWithRangeStart(selectorBrush.extent()[0], {rangeEnd: selectorBrush.extent()[1]});
	};

	/**
	 * Invoked to apply the specified ranges to the chart and the brush.
	 * @param rangeStart <Number or Date>			The beginning of the selected range.
	 * {
	 * 	@param rangeEnd <Number or Date>			The end of the selected range.
	 *	@param updateBrush <Boolean, nullable>		Defaults to NO. If set to YES, the selectorBrush extents will be updated to the new ranges.
	 *	@param animated <Boolean, nullable>			Defaults to NO. If set to YES, this change will be animated.
	 * }
	 */
	this.mainChartBrushApplyWithRangeStart = function (rangeStart, options) {
		try {
			var blocksRangeUpdates = chart.blocksRangeUpdates;
			chart.blocksRangeUpdates = YES;

			var extent = [+rangeStart, +options.rangeEnd];

			// Do not allow extents to be smaller than 0.05% percent of the total area
			if (extent[0] != extent[1]) {
				var extentInterval = extent[1] - extent[0];
				var domainInterval = selectorXScale.domain()[1] - selectorXScale.domain()[0];
				if (extentInterval / domainInterval < 0.0005) {
					var correctionInterval = domainInterval * 0.0005 - extentInterval;

					extent[0] -= correctionInterval / 2;
					extent[1] += correctionInterval / 2;
				}
			}

			// Update the brush if requested
			if (options.updateBrush) {
				selectorBrush.extent(extent);

				if (showsSelector) {
					if (options.animated) {
						selectorBrushSVGGroup.transition().duration(animationDuration).call(selectorBrush);
					}
					else {
						selectorBrushSVGGroup.call(selectorBrush);
					}
				}
			}

			// Update the X scale to the brush extent, if it exists
			// When the components are then redrawn, they will appear zoomed because of the new mapping between dates and device pixels
			mainChartXScale.domain(+rangeStart == +options.rangeEnd ? selectorXScale.domain() : extent);

			// Update the bindable range properties
			chart.setProperty('RangeStart', mainChartXScale.domain()[0]);
			chart.setProperty('RangeEnd', mainChartXScale.domain()[1]);

			// Redraw the SVG components with the new scale
			for (var i = 0; i < mainChartYFields.length; i++) {
				var config = mainChartDisplayConfiguration[i] || mainChartDisplayConfigurationDefault;

				// The line
				if (config.line) {
					var line = options.animated ? mainChartLineSVGGroups[i].transition().duration(animationDuration) : mainChartLineSVGGroups[i];
					line.select('path').attr("d", mainChartLineComponents[i](chart.data));
				}

				// The fill area
				if (config.fill) {
					var area = options.animated ? mainChartAreaSVGGroups[i].transition().duration(animationDuration) : mainChartAreaSVGGroups[i];
					area.select('path').attr("d", mainChartAreaComponents[i](chart.data));
				}

				// The data points
				if (config.dataPoint) {
					var data = chart.compactData || chart.data;
					var dataPoint = options.animated ? mainChartDataPointSVGGroups[i].selectAll('path').data(data).transition().duration(animationDuration) : mainChartDataPointSVGGroups[i].selectAll('path').data(data);

					dataPoint
      					.attr("transform", function(d) {
	      					var yValue = d[mainChartYFields[i]];

	      					if (mainChartIsAdditive) {
		      					for (var j = 0; j < i; j++) {
			      					yValue += d[mainChartYFields[j]] || 0;
		      					}
	      					}

	      					return "translate(" + mainChartXScale(d[mainChartXField]) + "," + mainChartYScales[i](yValue) + ")";
	      				});
				}
			}

			// Update the X axis
			if (options.animated) {
				mainChartXAxisSVGGroup.transition().duration(animationDuration).call(mainChartXAxis);
			}
			else {
				mainChartXAxisSVGGroup.call(mainChartXAxis);
			}

			// Update the secondary charts as well if they exist
			if (secondaryChartType == 'barchart') {
				chart.barChartSetExtent(mainChartXScale.domain(), {animated: options.animated});
			}
			else if (secondaryChartType == 'timeline') {
				chart.timelineUpdateExtentsAnimated(options.animated || NO);

				/*chart.timeline.beginning(mainChartXScale.domain()[0]);
				chart.timeline.ending(mainChartXScale.domain()[1]);
				chart.jqElement.find("#timeline").empty();
				try {
					chart.svg.select("#timeline").call(chart.timeline);
				}
				catch (e) {

				}*/
			}

			// Thresholds are immune to brushes; They are always at the same height and don't vary horizontally

		}
		catch (e) {
			console.log(e.stack);
		}
		finally {
			chart.blocksRangeUpdates = blocksRangeUpdates;
		}
	};




	/***************************************** THRESHOLDS *****************************************/

	/**
	 * Contains the threshold definitions.
	 */
	var thresholds;

	/**
	 * Contains the threshold D3 line components.
	 */
	var thresholdLineComponents = [];

	/**
	 * Contains the threshold line SVG groups.
	 */
	var thresholdLineSVGGroups = [];

	/**
	 * Contains the threshold hover SVG groups.
	 */
	var thresholdHoverSVGGroups = [];

	/**
	 * Constructs and returns a new D3 line component for the threshold at the specified index.
	 * @param i <Int>									The threshold index.
	 * @return <d3.line>								A D3 line component.
	 */
	this.thresholdCreateLineComponentWithIndex = function (i) {
		var line = d3.svg.line()
			    .interpolate(chart.interpolation)
			    .x(function(d) { return selectorXScale(d); }) // Thresholds always use the full scale; they aren't affected by zooms and pans
			    .y(function(d) { return mainChartYScales[0](thresholds[i].threshold); }); // Thresholds always have a constant Y value

		return line;
	};

	/**
	 * Constructs and returns a new SVG group for the threshold at the specified index. The group will be appended to the main SVG
	 * @param i <Int>										The threshold index.
	 * @return <d3.select>									A D3 selection containing the new group.
	 */
	this.thresholdCreateSVGGroupWithIndex = function (i) {
		var group = chart.svg.append("g")
			    .attr('class', 'threshold threshold' + i)
			    .attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin.top + ')')
			    .attr('clip-path', 'url(#clip-' + chart.jqElementId + ')');

		return group;
	};

	/**
	 * Constructs the initial threshold components.
	 */
	this.thresholdCreateComponents = function () {
		chart.thresholdCreateComponentsWithStartIndex(0);
	};

	/**
	 * Constructs the initial components for the thresholds in the given index range.
	 * @param startIndex <Int>				The index at which to start.
	 * {
	 *	@param endIndex <Int, nullable>		Defaults to the number of threhsolds. The end index will not be included in the range.
	 * }
	 */
	this.thresholdCreateComponentsWithStartIndex = function (startIndex, options) {
		options = options || {};
		var endIndex = options.endIndex === undefined ? thresholds.length : options.endIndex;

		for (var i = startIndex; i < endIndex; i++) {
			// Like the regular and selector charts, thresholds get line components and SVG groups.
			thresholdLineComponents[i] = chart.thresholdCreateLineComponentWithIndex(i);
			thresholdLineSVGGroups[i] = chart.thresholdCreateSVGGroupWithIndex(i);

			if (showsThresholds) {
				// And optionally hover groups if the showsThreshold property is checked.
				thresholdHoverSVGGroups[i] = chart.mainChartCreateSVGComponentsForHoverOfType('threshold', {withIndex: i});
			}
		}

		// Whenever any components are created, the brush, event overlays and tooltip groups must be brought to the front
		chart.mainChartBringComponentsToFront();
	};


	/**
	 * Removes a threshold SVG group from the chart.
	 * @param i <Int>								The group's index.
	 * {
	 *	@param animated <Boolean, nullable>					Defaults to NO. If set to YES, the removal will be animated.
	 * }
	 */
	this.thresholdRemoveGroupAtIndex = function (i, options) {
		options = options || {};

		var group = thresholdLineSVGGroups[i];

		if (!options.animated || !chart.data) {
			group.remove();
			return;
		}

		var finished = NO;
		threshold.select('path').transition()
			.style('stroke-opacity', 1e-6)
			.each('end', function () {
				if (!finished) {
					finished = YES;
					group.remove();
				}
			});

	}


	/**
	 * Removes count components from the end of all threshold component arrays.
	 * SVG groups will also be removed from the DOM.
	 * @param count <Int>						The number of elements to remove.
	 * {
	 *	@param animated <Boolean, nullable>		Defaults to NO. If set to YES, groups will be removed with an animation, otherwise they will be removed instantly.
	 * }
	 */
	this.thresholdTruncateFinalComponentsWithCount = function (count, options) {
		options = options || {};

		var animated = options.animated;

		var newCount = thresholds.length - count;
		var oldCount = thresholds.length;

		// Remove the SVG components
		for (var i = newCount; i < oldCount; i++) {
			chart.thresholdRemoveGroupAtIndex(i, {animated: animated});

			if (showsThresholds) {
				thresholdHoverSVGGroups[i].remove();
			}

		}

		// Truncate the arrays
		thresholdLineComponents.length = newCount;
		thresholdLineSVGGroups.length = newCount;

		if (showsThresholds) {
			thresholdHoverSVGGroups.length = newCount;
		}


	};

	/**
	 * Updates the threshold using the main chart data.
	 * @param animated <Boolean, nullable>			Defaults to YES. If set to YES, the update will be animated, otherwise it will be instant.
	 * {
	 *	@param updateProperties <Boolean, nullable>	Defaults to NO. If set to YES, the properties will also be updated even if the path already existed.
	 * }
	 */
	this.thresholdUpdateAnimated = function (animated, options) {
		if (!chart.data || !thresholds) return;

		options = options || {};
		if (animated === undefined) animated = YES;
		var updateProperties = options.updateProperties;

		for (var i = 0; i < thresholds.length; i++) {
			var path = thresholdLineSVGGroups[i].select('path');

			if (path.empty()) {
				// Create the path if doesn't exist
				path = thresholdLineSVGGroups[i].append('path').attr('d', thresholdLineComponents[i](selectorXScale.domain()));

				// If the update is animated, the threshold will fade in from invisible
				if (animated) path = path.style('stroke-opacity', 1e-6).transition().duration(animationDuration);

				// If the path was created, its properties also have to be applied
				updateProperties = YES;
			}
			else {
				if (animated) path = path.transition().duration(animationDuration);

				// Update the path to the new Y scale
				path.attr('d', thresholdLineComponents[i](selectorXScale.domain()));
			}

			if (updateProperties) {
				// Update all path properties if needed
				path.style('stroke-opacity', 1)
					.style('stroke', thresholds[i].color || chart.defaultColors[i])
					.style('stroke-dasharray', thresholds[i].pattern || null)
					.style('stroke-width', thresholds[i].thickness || 2);
			}
		}
	};



	/***************************************** BAR CHART *****************************************/

	/**
	 * The field names for the bar chart.
	 */
	var barChartYFields = [];

	/**
	 * The bar chart labels.
	 */
	var barChartLabels = [];

	/**
	 * The bar chart colors.
	 */
	var barChartColors = [];

	/**
	 * The bar chart SVG groups by y fields.
	 */
	var barChartGroups = [];

	/**
	 * The D3 Y scale for the bar chart. This is shared by all Y Fields.
	 */
	var barChartYScale;

	/**
	 * The minimum and maximum values if they were preset by the user.
	 * If they were not set, these values will be undefined.
	 */
	var barChartMinYValue, barChartMaxYValue;

	/**
	 * The D3 Y axis component for the bar chart.
	 */
	var barChartYAxis;

	/**
	 * The D3 scale used for the bar chart Y axis. This is the inverted version of the regular bar chart Y scale.
	 */
	var barChartAxisYScale;

	/**
	 * The D3 Y axis SVG group.
	 */
	var barChartYAxisSVGGroup;

	/**
	 * The bar chart time X field.
	 */
	var barChartXField;

	/**
	 * The D3 X axis SVG group. Requires the BarChartShowsXAxis property.
	 */
	var barChartXAxisSVGGroup;

	/**
	 * The bar chart X axis height. Set to 0 when the bar chart X axis is not enabled.
	 */
	var barChartXAxisHeight = 15;

	/**
	 * The bar chart hover tooltip SVG group.
	 */
	var barChartHoverSVGGroup;

	/**
	 * The bar chart data rows.
	 */
	var barChartData;

	/**
	 * Controls how multiple bars should appear. Must be one of:
	 *	- stacked		The bars appear one on top of each other
	 *	- together		The bars appear one next to each other
	 */
	var barChartStackMode;

	/**
	 * Reconstructs the supporting components required for drawing the bar chart.
	 */
	this.updateBarChartComponents = function () {
		// Construct the Y scale
		barChartYScale = d3.scale.linear().range([0, barChartHeight - barChartXAxisHeight]);

		// Construct the Y axis scale. This is the inverse of the regular Y scale
		barChartAxisYScale = d3.scale.linear().range([barChartHeight - barChartXAxisHeight, 0]);

		// Deconstruct the old groups
		this.svg.selectAll('.barChartGroup').remove();

		// Construct the D3 axis svg component
		barChartYAxis = d3.svg.axis()
			.scale(barChartAxisYScale)
			.orient('left')
			.ticks(chart.getProperty('BarChartNumberOfYTicks'))
			.tickFormat(function (d) {
				return numberFormat ? d.format(numberFormat) : d.toFixed();
			});

		// Construct the axis group; this only needs to happen once
		if (!barChartYAxisSVGGroup) {
			barChartYAxisSVGGroup = chart.svg.append("g")
						.attr("class", "y axis axis2")
						.attr('transform', 'translate(' + chart.margin.left + ', ' + (chart.jqElement.height() - chart.margin.bottom + 20 + barChartPadding) + ')')
						.style("font-family", "'Open Sans'")
						.style("font-size", (yAxisStyle && yAxisStyle.textSize) || "14");
							
			if (secondaryChartOnly) {
				// In secondary chart only mode, the bar chart will be glued to the top edge of the chart, replacing it.
				barChartYAxisSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin.top + ')');
			}

			if (chart.getProperty('BarChartShowsXAxis')) {
				barChartXAxisSVGGroup = chart.svg.append("g")
						.attr("class", "x axis axis3")
						.attr('transform', 'translate(' + chart.margin.left + ', ' + (chart.jqElement.height() - chart.margin.bottom + 20 + barChartPadding + barChartHeight - barChartXAxisHeight) + ')')
						.style("font-family", "'Open Sans'")
						.style("font-size", (xAxisStyle && xAxisStyle.textSize) || "14");
							
				if (secondaryChartOnly) {
					// In secondary chart only mode, the bar chart will be glued to the top edge of the chart, replacing it.
					barChartXAxisSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + (barChartHeight + chart.margin.top + barChartXAxisHeight) + ')');
				}
			}

		}
		else {
			// If they already exist, just update their transforms
			if (secondaryChartOnly) {
				barChartYAxisSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + chart.margin.top + ')');
			}
			else {
				barChartYAxisSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + (chart.jqElement.height() - chart.margin.bottom + 20 + barChartPadding) + ')');
			}

			if (barChartXAxisSVGGroup) {
				if (secondaryChartOnly) {
					barChartXAxisSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + (barChartHeight + chart.margin.top - barChartXAxisHeight) + ')');
				}
				else {
					barChartXAxisSVGGroup.attr('transform', 'translate(' + chart.margin.left + ', ' + (chart.jqElement.height() - chart.margin.bottom + 20 + barChartPadding + barChartHeight - barChartXAxisHeight) + ')');
				}
			}
		}

		// Construct the groups with their selections
		barChartGroups = [];

		for (var i = 0; i < barChartYFields.length; i++) {
			var groupYTranslation = (chart.jqElement.height() - chart.margin.bottom + 20 + barChartPadding);
							
			if (secondaryChartOnly) {
				// In secondary chart only mode, the bar chart will be glued to the top edge of the chart, replacing it.
				groupYTranslation = chart.margin.top;
			}
			
			// The outer group contains the clip path and the initial positioning
			var group = this.svg.append('g')
							.attr('class', "barChartGroup barChartGroup" + i)
							.attr("transform", "translate(" + chart.margin.left + ", "  + groupYTranslation + ")")
							// The inner group contains the actual bar chart elements and the transform
							.append('g')
							.style('fill', barChartColors[i] || chart.defaultColors[i]);

			this.jqElement.find('.barChartGroup' + i).css('clip-path', 'url(#secondaryClip-' + chart.jqElementId + ')');

			barChartGroups.push(group);
		}

		// Construct the hover components; this only needs to happen once
		if (!barChartHoverSVGGroup) {
				barChartHoverSVGGroup = chart.svg.append("g")
				    .attr("class", "hoverCircle hoverCircleBarChart")
				    .style("display", "none")
				    .style("pointer-events", "none");

				barChartHoverSVGGroup.append("circle")
				    .attr("r", 4.5)
					.style("fill", "#FFF")
					.style("stroke-width", 2)
					.attr("filter", "url(#" + chart.jqElementId + "labelshadow)")
					.style("stroke", 'white');

				barChartHoverSVGGroup.append("rect")
					.attr("class", "overlayBorder")
					.attr("filter", "url(#" + chart.jqElementId + "labelshadow)")
					.attr("width", 30)
					.attr("height", 24)
					.attr("rx", 4)
					.attr("ry", 4)
					.attr("x", 8)
					.attr("y", -14);

				barChartHoverSVGGroup.append("text")
			    	.attr("class", "overlayText")
					.style("font-family", "'Open Sans'")
					.style("font-size", "14")
					.style("fill", "#555555")
				    .attr("x", 14)
				    .attr("dy", ".35em");
		}

		// Resize the tooltip rect
		var height = 4 + 20 * barChartYFields.length;
		barChartHoverSVGGroup.select('rect').attr('height', height).attr('y', - height / 2);
		barChartHoverSVGGroup.select('text').attr('y', - (height - 24) / 2);

		// Bring the axis, hover overlay, hover circle and hover tooltip back to the front of the SVG
		var bringToFront = function () {
			this.parentNode.appendChild(this);
		};

		barChartYAxisSVGGroup.each(bringToFront);
		chart.svg.select('.overlay').each(bringToFront);
		barChartHoverSVGGroup.each(bringToFront);

	};

	/**
	 * Updates the colors of all bars.
	 */
	this.updateBarChartColors = function () {

		for (var i = 0; i < barChartYFields.length; i++) {
			barChartGroups[i].style('fill', barChartColors[i] || chart.defaultColors[i]);
		}
	}

	/**
	 * Reconstructs the bar chart.
	 */
	this.updateBarChart = function () {

		if (!chart.data) return;

		// Compute the Y domains
		var totalMax = undefined;
		var totalMin = undefined;

		var stacked = barChartStackMode == 'stacked';

		if (barChartStackMode == 'together') {
			// When the bars appear together, the min and max values are the lowest and largest value of any field in any point in the data set.
			for (var i = 0; i < barChartYFields.length; i++) {
				if (barChartMaxYValue === undefined) {
					var max = d3.max(barChartData.map(
						(function (i) {
							return function (d) {
								var result = d[barChartYFields[i]];
								//console.log("result is " + result);
								return result;
							};
						})(i)
					));
				}

				if (barChartMinYValue === undefined) {
					var min = d3.min(barChartData.map(
							(function (i) {
								return function (d) {
									var result = d[barChartYFields[i]];
									//console.log("result is " + result);
									return result;
								};
							})(i)
						));
				}

				totalMax = barChartMaxYValue === undefined ? max : barChartMaxYValue;
				totalMin = barChartMinYValue === undefined ? min : barChartMinYValue;
			}
		}
		else if (barChartStackMode == 'stacked') {
			var sumCallback = function (d) {
				var sum = 0;

				for (var i = 0; i < barChartYFields.length; i++) {
					sum += d[barChartYFields[i]];
				}

				return sum;
			};

			//var barChartDataMap = barChartData.map(sumCallback);

			// When the bars are stacked, the min and max values are the lowest and largest sum of fields for any point the data set.
			totalMax = barChartMaxYValue === undefined ? d3.max(barChartData.map(sumCallback)) : barChartMaxYValue;

			totalMin = barChartMinYValue === undefined ? d3.min(barChartData.map(function (d) {
				var min;

				for (var i = 0; i < barChartYFields.length; i++) {
					if (min === undefined || min > d[barChartYFields[i]]) {
						min = d[barChartYFields[i]];
					}
				}

				return min;
			})) : barChartMinYValue;
		}

		barChartYScale.domain([totalMin, totalMax]);
		barChartAxisYScale.domain(barChartYScale.domain());

		// Compute the generic sizes
		var widthPerInterval = selectorXScale(chart.data[0][mainChartXField] + barChartInterval * 0.9) - selectorXScale(chart.data[0][mainChartXField]);
		var fullWidthPerInterval = selectorXScale(chart.data[0][mainChartXField] + barChartInterval) - selectorXScale(chart.data[0][mainChartXField]);

		var spacePerBar = 1;
		// Stacked bars are all the full width, other bars each take a portion of the available interval space
		var widthPerBar = stacked ? fullWidthPerInterval - 1 : fullWidthPerInterval / barChartYFields.length - 1;

		// In some cases, the data is so dense that the bars cannot be drawn with a 1 pixel distance between the bars
		// In these cases, the width will be set to 90% of the interval section
		if (widthPerBar < 0) {
			widthPerBar = (fullWidthPerInterval / barChartYFields.length) * 0.9;
			spacePerBar = (fullWidthPerInterval / barChartYFields.length) * 0.1;
		}

		// Update the bars
		for (var i = 0; i < barChartYFields.length; i++) {
			var group = barChartGroups[i];

			var selection = group.selectAll('rect')
				.data(barChartData, function (d) { return (d[barChartXField] / barChartInterval | 0) * barChartInterval; });


			// bars that need to be removed
			var transition;

			if (animationsEnabled) {
				transition = selection.exit().transition().duration(animationDuration);
			}
			else {
				transition = selection.exit();
			}

			transition.attr('y', barChartHeight - barChartXAxisHeight)
				.attr('height', 0)
				.style('fill-opacity', 1e-6)
				.remove();

			// bars that need to be created
			selection.enter()
				.append('rect')
				.attr('y', barChartHeight - barChartXAxisHeight)
				.attr('height', 0);

			if (animationsEnabled) {
				transition = selection.transition().duration(animationDuration);
			}
			else {
				transition = selection;
			}

			// bars that were created and bars that need to be updated
			transition.attr('width', widthPerBar)
				.attr('height', (function (i) { return function (d) {
					return barChartYScale(d[barChartYFields[i]]);
				}; })(i))
				.attr('x', (function (i) { return function (d) {
					// Stacked bars have the same X position, other bars are each displaced
					var x = selectorXScale(Math.floor(d[barChartXField] / barChartInterval) * barChartInterval) + (stacked ? 0 : (widthPerBar + spacePerBar) * i);

					// displace the x towards the left by half an interval to center it
					//x = x - widthPerInterval / 2;
					return x;

				}; })(i))
				.attr('y', (function (i) { return function (d) {
					var value = d[barChartYFields[i]];

					// Stacked bars need additional padding so they appear above their sibling bars
					if (stacked) for (var j = 0; j < i; j++) {
						value += d[barChartYFields[j]];
					}

					return barChartHeight - barChartXAxisHeight - barChartYScale(value);
				}; })(i));
		}

		// Update the y axis
		barChartYAxisSVGGroup.transition().duration(animationDuration).call(barChartYAxis);

		// Update the x axis, if it is available
		if (barChartXAxisSVGGroup !== undefined) {
			barChartXAxisSVGGroup.transition().duration(animationDuration).call(mainChartXAxis);
		}

		// Update the transforms
		chart.barChartSetExtent(selectorBrush.empty() ? selectorXScale.domain() : selectorBrush.extent());

	 };

	/**
	 * Applies the given extent to the bar chart.
	 * @param extent <[Number or Date, Number or Date]>		The new extent.
	 * {
	 *	@param animated	<Boolean, nullable>					Defaults to NO. If set to YES, the change will be animated.
	 * }
	 */
	this.barChartSetExtent = function (extent, options) {
		options = options || {};

		var domain = selectorXScale.domain();

		var domainLength = domain[1] - domain[0];

		// compute the scale
		var scale = domainLength / (extent[1] - extent[0]);

		// compute the horizontal translation
		var translation = (extent[0] - domain[0]) * scale + (scale * domainLength - domainLength) / 2;

		var translateX = (selectorXScale(domain[0]) - selectorXScale(extent[0])) * scale;
		// The Y translation is handled by the outer group
		var translateY = 0;//(chart.jqElement.height() - chart.margin.bottom + 15 + barChartPadding);

		for (var i = 0; i < barChartYFields.length; i++) {
			var group = options.animated ? barChartGroups[i].transition().duration(animationDuration) : barChartGroups[i];
			group.attr('transform', "translate(" + translateX + ","  + translateY + ")" + 'scale(' + scale + ' 1)');
		}

		// Update the x axis, if it is available
		if (barChartXAxisSVGGroup !== undefined) {
			if (options.animated) {
				barChartXAxisSVGGroup.transition().duration(animationDuration).call(mainChartXAxis);
			}
			else {
				barChartXAxisSVGGroup.call(mainChartXAxis);
			}
		}

	}

	/**
	 * Finds and returns the bar chart data point that matches the given date.
	 * @param date <Number>			The timestamp.
	 * @return <Object, nullable>	The data point if it was found, undefined otherwise.
	 *								If multiple data points match this date, only the first point is returned.
	 */
	this.barChartDataPointWithTimestamp = function (date) {
		var intervalMin = Math.floor(date / barChartInterval) * barChartInterval;
		var intervalMax = intervalMin + barChartInterval;

		for (var i = 0; i < barChartData.length; i++) {
			var pointTime = +barChartData[i][barChartXField];
			if (pointTime >= intervalMin && pointTime < intervalMax) {
				return barChartData[i];
			}
		}
	}



	/***************************************** TIMELINE *****************************************/

	/**
	 * The field name which contains the timeline state.
	 */
	var timelineStateField;

	/**
	 * The field name which contains the timeline start time.
	 */
	var timelineXStartField;

	/**
	 * The field name which contains the timeline end time.
	 * This field may be left undefined, in which case the end time will be determined automatically.
	 */
	var timelineXEndField;

	/**
	 * A dictionary that maps timeline states to their colors.
	 */
	var timelineColorMap = {};

	/**
	 * A dictionary that maps timeline states to their human readable labels.
	 */
	var timelineLabelMap = {};

	/**
	 * Controls how tall the timeline should be.
	 */
	var timelineHeight = 0;

	/**
	 * Controls the spacing between the timeline, selector and chart.
	 */
	var timelinePadding = 0;

	/**
	 * The SVG group containing the timeline.
	 */
	var timelineSVGGroup;

	/**
	 * The SVG group containing the timeline hover components.
	 */
	var timelineHoverSVGGroup;

	/**
	 * Controls whether the timeline also includes an X axis or not.
	 */
	var timelineShowsXAxis = NO;

	/**
	 * The SVG group containing the timeline X axis.
	 */
	var timelineXAxisSVGGroup;

	/**
	 * Constructs and returns the SVG group in which the timeline should be rendered.
	 * This group will be automatically added to the SVG.
	 * @param type <String>			Must be 'timeline' or 'axis'. The type of contents that this group will have.
	 * @return <d3.select>			The D3 selection containing the svg group.
	 */
	this.timelineCreateSVGGroupOfType = function (type) {
		var topMargin = chart.margin.top + chart.height + 15 + timelinePadding;
		if (type == 'axis') {
			topMargin += timelineHeight;
		}

		var className = 'timeline';
		if (type == 'axis') className = 'x axis axis3';

		var group = chart.svg.append("g")
			    .attr('class', className)
			    .attr('transform', 'translate(' + chart.margin.left + ', ' + topMargin + ')') // The 15 pixels correspond to the height of the main chart x axis.
			    .attr('clip-path', 'url(#secondaryClip-' + chart.jqElementId + ')');

		if (type == 'axis') {
			group.style("font-family", "'Open Sans'")
			.style("font-size", (xAxisStyle && xAxisStyle.textSize) || "14")
		}

		return group;
	}

	/**
	 * Creates the initial timeline components.
	 */
	this.timelineCreateComponents = function () {
		timelineSVGGroup = chart.timelineCreateSVGGroupOfType('timeline');

		timelineShowsXAxis = chart.getProperty('TimelineShowsXAxis');

		timelineHoverSVGGroup = chart.mainChartCreateSVGComponentsForHoverOfType('timeline');

		if (timelineShowsXAxis) {
			timelineXAxisSVGGroup = chart.timelineCreateSVGGroupOfType('axis');
		}
	};

	/**
	 * Returns a string that represents a unique identifier for a timeline data point.
	 * The identifier will consider both the represented state and the starting time.
	 * @param point <Object>					The timeline data point.
	 * @return <String>							A unique identifier.
	 */
	this.timelineIdentifierForDataPoint = function (point) {
		return point[timelineStateField] + '-' + point[timelineXStartField];
	};

	/**
	 * Updates the timeline using the supplied prepared data.
	 * The data must have valid start and end times.
	 * @param data <[Object]>					The data points.
	 * {
	 *	@param animated <Boolean, nullable>		Defaults to NO. If set to YES, this change will be animated, otherwise it will be instant.
	 * }
	 */
	this.timelineUpdateWithData = function (data, options) {
		options = options || {};

		var rects = timelineSVGGroup.selectAll('rect').data(data, function (d, i) { return chart.timelineIdentifierForDataPoint(d); });

		var transition;


		// Deleted rects should animate to a height of 0 and fade
		if (options.animated) {
			transition = rects.exit().transition().duration(animationDuration);
		}
		else {
			transition = rects.exit();
		}

		transition.attr('height', 0)
			.attr('y', timelineHeight)
			.attr('fillOpacity', 1e-6)
			.remove();

		// New rects should animate from a height of 0 and fade
		rects.enter().append('rect')
			.attr('height', 0)
			.attr('y', timelineHeight)
			.attr('x', function (d) { return mainChartXScale(d[timelineXStartField]); } )
			.attr('width', function (d) { return mainChartXScale(d[timelineXEndField || ('__D3RangeChart__end__' + timelineXStartField)]) - mainChartXScale(d[timelineXStartField]); } )
			.attr('fillOpacity', 1e-6)
			.attr('fill', function (d) { return timelineColorMap[d[timelineStateField]]; });

		// All other rects should transition to their new positions and sizes
		if (options.animated) {
			transition = rects.transition().duration(animationDuration);
		}
		else {
			transition = rects;
		}

		transition.attr('height', timelineHeight)
			.attr('y', 0)
			.attr('x', function (d) { return mainChartXScale(d[timelineXStartField]); } )
			.attr('width', function (d) { return mainChartXScale(d[timelineXEndField || ('__D3RangeChart__end__' + timelineXStartField)]) - mainChartXScale(d[timelineXStartField]) + 0.5; } )
			.attr('fillOpacity', 1);

		// Update the X axis if it is enabled
		if (timelineShowsXAxis) {
			if (options.animated) {
				timelineXAxisSVGGroup.transition().duration(animationDuration).call(mainChartXAxis);
			}
			else {
				timelineXAxisSVGGroup.call(mainChartXAxis);
			}
		}

	};

	/**
	 * Updates the timeline to the main chart extents.
	 * @param animated <Boolean, nullable>		Defaults to YES. If set to YES, this change will be animated, otherwise it will be instante.
	 */
	this.timelineUpdateExtentsAnimated = function (animated) {
		if (animated === undefined) animated = YES;

		// Just select and update the rects; they should already have all the data.

		if (!chart.timelineData) return;

		var rects = timelineSVGGroup.selectAll('rect').data(chart.timelineData, function (d, i) { return chart.timelineIdentifierForDataPoint(d); });

		if (animated) {
			transition = rects.transition().duration(animationDuration);
		}
		else {
			transition = rects;
		}

		transition.attr('height', timelineHeight)
			.attr('y', 0)
			.attr('x', function (d) { return mainChartXScale(d[timelineXStartField]); } )
			.attr('width', function (d) { return mainChartXScale(d[timelineXEndField || ('__D3RangeChart__end__' + timelineXStartField)]) - mainChartXScale(d[timelineXStartField]) + 0.5; } );

		// Update the X axis if it is enabled
		if (timelineShowsXAxis) {
			if (animated) {
				timelineXAxisSVGGroup.transition().duration(animationDuration).call(mainChartXAxis);
			}
			else {
				timelineXAxisSVGGroup.call(mainChartXAxis);
			}
		}

	}





	/***************************************** MOUSE & TOUCH EVENTS *****************************************/

	/**
	 * The SVG element that receives all mouse and touch events.
	 */
	var eventHandlerSVGOverlay;

	/**
	 * Mouse devices only. When set to YES, the user can click and drag on the chart to zoom it in and right click to reset its zoom.
	 */
	var eventHandlerSupportsDragToResize = NO;

	/**
	 * Set to YES while the user is actively dragging to resize.
	 */
	var eventHandlerIsDraggingToResize = NO, eventHandlerResizeRangeStart, eventHandlerResizeRangeEnd, eventHandlerResizeInitialDeviceX;

	/**
	 * Mouse and touchpad devices only. When set to YES, the user can zoom using the mouse wheel.
	 * On Macbooks, this will allow zooming by performing a two finger scroll up and down and panning a zoomed chart with a two finger scroll left and right.
	 */
	var eventHandlerSupportsWheelGestures = NO;

	/**
	 * Touch devices only. When set to YES, the user can zoom using a pinch gesture and pan using a two finger swipe.
	 */
	var eventHandlerSupportsTouchGestures = NO;

	/**
	 * The date bisector is a D3 component that finds the closest left or right index in the data set that corresponds to a given date.
	 */
	var eventHandlerDateBisector = d3.bisector(function(d) { return d[mainChartXField]; });

	/**
	 * The time formatted used by event handlers to format tooltip dates.
	 */
	var eventHandlerTimeFormatter;

	/**
	 * Creates the event handler mask element and initializes the event handlers on it.
	 */
	this.eventHandlersInitialize = function () {

		eventHandlerTimeFormatter = timeFormat ? d3.time.format(timeFormat) : d3.time.format('%x %X');

		var eventHandlerHeight = chart.height;

		if (secondaryChartType == 'barchart') {
			eventHandlerHeight += barChartPadding * 2 + barChartHeight + 15;
		}
		else if (secondaryChartType == 'timeline') {
			eventHandlerHeight += timelinePadding * 2 + timelineHeight + 15;
		}

		eventHandlerSVGOverlay = chart.svg.append("rect")
		    .attr("class", "overlay")
		    .attr("width", chart.width)
		    .attr("height", eventHandlerHeight)
		    .attr("x", chart.margin.left)
		    .attr("y", chart.margin.top);

		var eventHandlerSVGOverlayNode = eventHandlerSVGOverlay.node();

		// Generic mouse events
		eventHandlerSVGOverlay.on('mouseover', function () { chart.pointerDidEnterChartWithEvent(d3.event, {coordinates: d3.mouse(this)}); } );
		eventHandlerSVGOverlay.on('mousemove', function () {
			var mouseCoordinates = d3.mouse(this);
			chart.pointerDidMoveWithEvent(d3.event, {coordinates: mouseCoordinates});

			// For mouse drags, the case where the user is dragging to zoom should also be handled in mousemove
			if (eventHandlerIsDraggingToResize) {
				var dragSelectorLeft = Math.min(mouseCoordinates[0], eventHandlerResizeInitialDeviceX);

				chart.dragSelector.css({
					left: dragSelectorLeft + 'px',
					width: Math.abs(mouseCoordinates[0] - eventHandlerResizeInitialDeviceX) + 'px'
				});

				chart.dragSelector.data('left', dragSelectorLeft);
			}
		});
		eventHandlerSVGOverlay.on('mouseout', function () { chart.pointerDidExitChartWithEvent(d3.event, {coordinates: d3.mouse(this)}); } );

		// Drag to resize
		eventHandlerSupportsDragToResize = chart.getProperty('DragToZoom');

		if (eventHandlerSupportsDragToResize) {
			eventHandlerSVGOverlay.on('mousedown', function () {
				d3.event.preventDefault();

				var mouse = d3.mouse(this)[0] + chart.margin.left;
				eventHandlerResizeRangeStart = mainChartXScale.invert(mouse - 2 * chart.margin.left);
				eventHandlerResizeInitialDeviceX = mouse - chart.margin.left;

				if (!eventHandlerIsDraggingToResize) {
					eventHandlerIsDraggingToResize = YES;

					// Construct and add a drag indicator to the page
					chart.dragSelector = $('<div class="D3RangeChartDragSelector">');

					var dragSelector = chart.dragSelector;

					chart.dragSelector.css({
						top: chart.margin.top + 'px',
						height: (chart.height + barChartPadding + barChartHeight + timelinePadding + timelineHeight) + 'px',
						width: '0px',
						left: eventHandlerResizeInitialDeviceX + 'px'
					});

					chart.jqElement.append(chart.dragSelector);

					$(document).on('mouseup.' + chart.jqElementId, function (event) {
						chart.dragSelector = undefined;

						// Animate and remove the drag selector
						if (animationsEnabled) {
							// Velocity is much faster than jQuery for animations
							// It should be used whenever possible
							if ($.Velocity) {
								// In velocity, animations may be done using transforms, which don't cause repaints or reflows
								var translation = chart.margin.left - dragSelector.data('left');
								var scaleX = chart.width / dragSelector.width();

								$.Velocity.hook(dragSelector, 'transformOriginX', '0%');

								dragSelector.velocity({
									translateX: translation,
									scaleX: scaleX,
									opacity: 0,
									translateZ: 0
								}, {
									duration: animationDuration,
									easing: 'easeInOutQuad',
									complete: function () { dragSelector.remove(); }
								});
							}
							else {
								dragSelector.animate({
									left: chart.margin.left,
									width: chart.width,
									opacity: 0
								}, {
									duration: animationDuration,
									complete: function () { dragSelector.remove(); }
								});
							}
						}
						else {
							dragSelector.remove();
						}

						$(document).off('mouseup.' + chart.jqElementId);

						// Apply the new ranges
						if (eventHandlerIsDraggingToResize) {
							eventHandlerIsDraggingToResize = NO;

							var offset = chart.jqElement.offset();
							var mouse =  event.pageX - offset.left - chart.margin.left;

							//var mouse = d3.mouse(this)[0] + chart.margin.left;
							eventHandlerResizeRangeEnd = mainChartXScale.invert(mouse);

							// Do not apply the new range if there was no actual range selected.
							if (+eventHandlerResizeRangeStart == +eventHandlerResizeRangeEnd) return;

							// If the end range is older than the start range, invert them
							if (+eventHandlerResizeRangeStart > +eventHandlerResizeRangeEnd) {
								var range = eventHandlerResizeRangeEnd;
								eventHandlerResizeRangeEnd = eventHandlerResizeRangeStart;
								eventHandlerResizeRangeStart = range;
							}

							// Make sure the ranges to not extend past the maximum range
							var totalDomain = selectorXScale.domain();
							if (eventHandlerResizeRangeStart < totalDomain[0]) eventHandlerResizeRangeStart = totalDomain[0];
							if (eventHandlerResizeRangeStart > totalDomain[1]) eventHandlerResizeRangeStart = totalDomain[1];
							if (eventHandlerResizeRangeEnd < totalDomain[0]) eventHandlerResizeRangeStart = totalDomain[0];
							if (eventHandlerResizeRangeEnd > totalDomain[1]) eventHandlerResizeRangeEnd = totalDomain[1];

							// Apply the new ranges
							chart.mainChartBrushApplyWithRangeStart(eventHandlerResizeRangeStart, {rangeEnd: eventHandlerResizeRangeEnd, updateBrush: YES, animated: animationsEnabled});
						}
					});
				}
			});

			eventHandlerSVGOverlay.on('contextmenu', function () {
				d3.event.preventDefault();

				eventHandlerIsDraggingToResize = NO;

				chart.mainChartBrushApplyWithRangeStart(0, {rangeEnd: 0, updateBrush: YES, animated: animationsEnabled});
			});
		}

		// Mouse wheel/Two finger gestures on MacBooks
		eventHandlerSupportsWheelGestures = chart.getProperty('EnableTrackGesturesPadAndWheel');

		if (eventHandlerSupportsWheelGestures) {
			eventHandlerSVGOverlay.on('wheel', function () {
				var event = d3.event;

				event.preventDefault();

				var panAmount = event.deltaX;
				var zoomAmount = event.deltaY;

				if (Math.abs(panAmount) > Math.abs(zoomAmount)) {
					zoomAmount = 0;
				}
				else {
					panAmount = 0;
				}

				// Line events are considered to be 20 pixels
				if (event.deltaMode == 1) {
					panAmount *= 20;
					zoomAmount *= 20;
				}

				// Handle pan events
				if (panAmount) {
					chart.moveWithPixelAmount(panAmount);
				}

				// Handle zoom events
				if (zoomAmount) {
					var deviceX = d3.mouse(this)[0] - chart.margin.left;
					chart.zoomWithPixelAmount(zoomAmount, {aroundDeviceX: deviceX});
				}

				// Update the hover point positions
				chart.pointerDidMoveWithEvent(d3.event, {coordinates: d3.mouse(this)});

			});
		}

		// Two finger pan and pinch zooming
		eventHandlerSupportsTouchGestures = chart.getProperty('EnableTouchGestures');

		if (eventHandlerSupportsTouchGestures) {
			var touchesStarted = 0;
			var isTwoFingerEvent = NO;

			// Tracks the positions of fingers over the course of two finger events
			var firstFingerLastPosition;
			var secondFinderLastPosition;

			eventHandlerSVGOverlay.on('touchstart', function () {
				touchesStarted++;

				chart.pointerDidEnterChartWithEvent(d3.event, {coordinates: d3.mouse(this)});

				if (d3.event.touches.length == 2) {
					firstFingerLastPosition = d3.event.touches[0].pageX;
					secondFingerLastPosition = d3.event.touches[1].pageX;
				}

			});

			eventHandlerSVGOverlay.on('touchmove', function () {
				var event = d3.event;

				var touches = event.touches;
				if (touches.length) {
					chart.pointerDidMoveWithEvent(d3.event, {coordinates: d3.mouse(this)});
				}

				// Is two finger guarantees that there are at least two finger actively tracking the chart
				// In this case, two finger panning and zooming may be evaluated
				if (touches.length == 2) {

					if (firstFingerLastPosition && secondFingerLastPosition) {
						var firstFingerDelta =  firstFingerLastPosition - d3.event.touches[0].pageX;
						var secondFingerDelta =  secondFingerLastPosition - d3.event.touches[1].pageX;

						// Check for panning. For a two finger event to be recognized as a pan event, the two fingers must be moving in the same horizontal direction
						var firstFingerSign = signOfNumber(firstFingerDelta);
						var secondFingerSign = signOfNumber(secondFingerDelta);

						// On mobile devices, two finger events can be both pan and zoom events at the same time
						// A pan is considered to be the average between the fingers' deltas
						// While the zoom is the delta of the difference between the current and previous values
						chart.performGesturesWithBlock(function () {
							//If the signs are equal, this is a pan event
							if (firstFingerSign == secondFingerSign) {
								var averagePixelDelta = (firstFingerDelta + secondFingerDelta) / 2;
								chart.moveWithPixelAmount(averagePixelDelta);
							}
							else {
								// The resize position will be the center point between the two fingers
								var touchPosition = d3.event.touches[0].pageX + firstFingerDelta / 2;

								// The raw event coordinates are relative to the page and they need to be transformed to be relative to the chart
								var offset = chart.jqElement.offset();
								var deviceX = touchPosition - offset.left - chart.margin.left;

								// Else it's a zoom event
								// The zoom delta is the difference between the last distance and the current distance
								var zoomDelta = Math.abs(d3.event.touches[0].pageX - d3.event.touches[1].pageX) - Math.abs(firstFingerLastPosition - secondFingerLastPosition);
								chart.zoomWithPixelAmount(zoomDelta, {aroundDeviceX: deviceX});
	 						}
						});
					}

					// If either finger did not move, this event will not be processed as a two finger event
					//if (firstFingerSign != 0 && secondFingerSign != 0) {
					//}


					firstFingerLastPosition = d3.event.touches[0].pageX;
					secondFingerLastPosition = d3.event.touches[1].pageX;

				}
			});

			eventHandlerSVGOverlay.on('touchend', function () {
				touchesStarted--;

				chart.pointerDidExitChartWithEvent(d3.event, {coordinates: d3.mouse(this)});


				if (touchesStarted == 1) {
					isTwoFingerEvent = NO;
				}

			});
		}

	};

	/**
	 * Returns the sign of the specified number as follows:
	 *	- 0 If the number is 0 or NaN
	 *	- 1 If the number is positive
	 *	- -1 If the number is negative
	 * @param number <Number>		The number.
	 * @return <Int>				The sign.
	 */
	function signOfNumber(number) {
		return number ? (number < 0 ? -1 : 1) : 0
	}

	/**
	 * The domain that will be modified by batch operations.
	 */
	var gestureDomain;

	/**
	 * Should be invoked when multiple gesture transforms happen in quick succession and should be grouped together.
	 * This function will execute the given block and perform all gestures within it using a temporary domain.
	 * After the block executes, the changes are then applied to the chart.
	 * The block will execute synchronously before this function returns.
	 * @param block <void ^ ()>		The block to execute.
	 */
	this.performGesturesWithBlock = function (block) {
		gestureDomain = mainChartXScale.domain().slice();

		block();

		chart.mainChartBrushApplyWithRangeStart(gestureDomain[0], {rangeEnd: gestureDomain[1], updateBrush: YES, animated: NO});

		gestureDomain = undefined;
	};

	/**
	 * Should invoked in response to a horizontal wheel or two finger scroll event. Moves the selector by the given amount of pixels.
	 * @param panAmount <Number>		The pan amount in pixels.
	 */
	this.moveWithPixelAmount = function (panAmount) {
		var datePanAmount = mainChartXScale.invert(panAmount) - mainChartXScale.invert(0);

		var domain = gestureDomain ? gestureDomain.slice() : mainChartXScale.domain().slice();
		var domainLimits = selectorXScale.domain();

		domain[0] = +domain[0] + datePanAmount;
		domain[1] = +domain[1] + datePanAmount;

		// Make sure that none of the changes makes the domain become invalid
		if (domain = chart.domainByLimitingDomain(domain, {toDomain: domainLimits})) {
			// If this is a batched operation, write its results to the gestureDomain and do not apply to the chart
			if (gestureDomain) {
				gestureDomain = domain;
				return;
			}

			// If so apply the new ranges
			chart.mainChartBrushApplyWithRangeStart(domain[0], {rangeEnd: domain[1], updateBrush: YES, animated: NO});
		}
	};

	/**
	 * Should be invoked in responze to a vertical wheel or pinch zoom event. Zooms the chart by the given amount of pixels.
	 * @param zoomAmount <Number>			The zoom delta in pixels.
	 * {
	 *	@param aroundDeviceX <Number>		The device X point around which to zoom, in pixels.
	 * }
	 */
	this.zoomWithPixelAmount = function (zoomAmount, options) {
		var deviceX = options.aroundDeviceX

		// Each zoom pixel should account for 1% of the current domain
		// Positive zoom amounts should increase the viewable area, while negative amounts should decrease the viewable area
		var zoomPercent = zoomAmount * 0.01;

		var currentDomain = gestureDomain ? gestureDomain.slice() : mainChartXScale.domain().slice();
		var currentDomainLength = currentDomain[1] - currentDomain[0];

		// The zoom should be centered around the mouse pointer position
		var date = +mainChartXScale.invert(deviceX);
		var pointerPercent = (date - currentDomain[0]) / currentDomainLength;


		var dateZoomAmount = currentDomainLength * zoomPercent;
		var domain = currentDomain;
		var domainLimits = selectorXScale.domain();

		domain[0] = +domain[0] + dateZoomAmount * pointerPercent;
		domain[1] = +domain[1] - dateZoomAmount * (1 - pointerPercent);

		// Make sure that none of the changes makes the domain become invalid
		if (domain = chart.domainByLimitingDomain(domain, {toDomain: domainLimits, mode: 'resize'})) {
			// If this is a batched operation, write its results to the gestureDomain and do not apply to the chart
			if (gestureDomain) {
				gestureDomain = domain;
				return;
			}

			// If so apply the new ranges
			chart.mainChartBrushApplyWithRangeStart(domain[0], {rangeEnd: domain[1], updateBrush: YES, animated: NO});
		}
	};


	/**
	 * Returns the intersection of the supplied domain and the limit domain.
	 * @param domain <[Number or Date, Number or Date]>			The domain to limit.
	 * {
	 *	@param toDomain <[Number or Date, Number or Date]>		The limit domain.
	 *	@param mode <String, nullable>							Defaults to 'move'. If set to 'move', the source domain will stick to the edges and not resize itself.
	 *															If set to 'resize', the source domain will resize itself when it reaches the edges.
	 * }
	 * @return <[Number or Date, Number or Date], nullable>		The limited domain.
	 *															If the source domain does not intersect the target domain, this function will return undefined.
	 */
	this.domainByLimitingDomain = function (domain, options) {
		domain = [+domain[0], +domain[1]];
		var domainLimits = [+options.toDomain[0], +options.toDomain[1]];

		if (domain[0] < domainLimits[0]) {
			if (options.mode == 'resize') {
				domain[0] = domainLimits[0];
			}
			else {
				var difference = domainLimits[0] - domain[0];
				domain[0] += difference;
				domain[1] += difference;
			}
		}
		if (domain[1] > domainLimits[1]) {
			if (options.mode == 'resize') {
				domain[1] = domainLimits[1];
			}
			else {
				var difference = domainLimits[1] - domain[1];
				domain[0] += difference;
				domain[1] += difference;
			}
		}

		// Make sure that none of the changes makes the domain become invalid
		if (domain[0] < domain[1] && domain[0] < domainLimits[1] && domain[1] > domainLimits[0] && domain[0] != domain[1]) {
			// If so, return the domain
			return domain;
		}
	}


	/**
	 * Invoked when the mouse first enters the chart, or, on a touch device, when the user first touches inside the chart.
	 * @param event <Event>				The DOM event that triggered this callback.
	 * {
	 * 	@param coordinates <[x, y]>		An array containing the coordinates. Element 0 is the X coordinate and element 1 is they Y coordinate.
	 * }
	 */
	this.pointerDidEnterChartWithEvent = function (event, options) {
		chart.pointerDidMoveWithEvent(event, {coordinates: options.coordinates});
		chart.tooltipElementsSetHidden(NO);
	};


	/**
	 * Invoked when the mouse moves over the chart, or, on a touch device, when the user drags inside the chart.
	 * @param event <Event>				The DOM event that triggered this callback.
	 * {
	 * 	@param coordinates <[x, y]>		An array containing the coordinates. Element 0 is the X coordinate and element 1 is they Y coordinate.
	 * }
	 */
	this.pointerDidMoveWithEvent = function (event, options) {
		event.preventDefault();
		chart.tooltipElementsUpdateForDeviceX(options.coordinates[0], {withEvent: event});
	};

	/**
	 * Invoked when the mouse exits the chart, or, on a touch device, when the user stops touching the chart.
	 * @param event <Event>				The DOM event that triggered this callback.
	 * {
	 * 	@param coordinates <[x, y]>		An array containing the coordinates. Element 0 is the X coordinate and element 1 is they Y coordinate.
	 * }
	 */
	this.pointerDidExitChartWithEvent = function (event, options) {
		chart.tooltipElementsSetHidden(YES);
	};


	/**
	 * Updates the tooltip elements to the correct values and positions for the given event.
	 * @param x <Int>				The x pixel position.
	 * {
	 *	@param withEvent <Event>	The event for which the tooltips should be updated.
	 * }
	 */
	this.tooltipElementsUpdateForDeviceX = function (deviceX, options) {

		deviceX = deviceX - chart.margin.left;

		if (deviceX < 0) deviceX = 0;
		if (deviceX > chart.width) deviceX = chart.width;

		var data = chart.compactData || chart.data;

		// The date that corresponds to the hovered area
		var date = +mainChartXScale.invert(deviceX);

		// The data index and its associated date that are closest to the resolved date
		var dataIndex = eventHandlerDateBisector.left(data, date) - 1;
		if (dataIndex < 0) dataIndex = 0;
		var dataDate = data[dataIndex][mainChartXField];
		var nextDataDate;

		// The percent shows how far the resolved date is between the previous and the next points in the data set.
		// A value closer to 0 indicates that the resolved date is closer to the previous point while a value closer to 1 indicates that is closer to the next point
		var percent;
		if (dataIndex == data.length - 1) {
			nextDataDate = dataDate;
			percent = 0;

			// Handles undefined data objects - these shouldn't be in the data set normally
			if (!data[dataIndex]) return;
		}
		else {

			// Handles undefined data objects - these shouldn't be in the data set normally
			if (!data[dataIndex] || !data[dataIndex + 1]) return;

			nextDataDate = data[dataIndex + 1][mainChartXField];
			percent = (date - dataDate) / (nextDataDate - dataDate);
		}

		// The tooltip positioning is batched to handle the cases where the tooltips would overlap
		// This way, it is ensured that they will never overlap
		chart.positionTooltipsWithBlock(function () {

			if (snaps) {
				// Snapping is quite easy to handle, as no additional interpolation should be done on the data

				// Which data point is the closest depends on whether the percent is closer to 0 or to 1
				var snappedIndex = dataIndex;
				var snappedDate = dataDate;
				if (percent > 0.5) {
					snappedIndex = dataIndex + 1;
					snappedDate = nextDataDate;
				}

				var tooltipX = mainChartXScale(snappedDate);

				// The value sum computes the sums of the values for additive charts
				var tooltipValueSum = 0;

				// Update the chart tooltips
				for (var i = 0; i < mainChartYFields.length; i++) {
					// The y position is the transformed value at the snapped index
					var value = data[snappedIndex][mainChartYFields[i]];
					if (mainChartIsAdditive) tooltipValueSum += value;

					var tooltipY = mainChartYScales[i](mainChartIsAdditive ? tooltipValueSum : value);

					var tooltipText = (mainChartLabels[i] || mainChartYFields[i]) + ': ' + (numberFormat ? value.format(numberFormat) : value.toFixed(2));

					chart.positionTooltip(mainChartHoverSVGGroups[i], {toDeviceX: tooltipX, deviceY: tooltipY, withText: tooltipText, animated: animationsEnabled});
				}

				// Update the timestamp tooltip if needed
				if (showsTimestamp) {
					var tooltipText = 'Time: ' + eventHandlerTimeFormatter(new Date(+snappedDate));

					chart.positionTooltip(mainChartTimestampSVGHoverGroup, {toDeviceX: tooltipX, deviceY: chart.height, withText: tooltipText, animated: animationsEnabled});
				}

				// Update the threshold tooltips if needed
				if (showsThresholds) {

					for (var i = 0; i < thresholds.length; i++) {
						var tooltipText = (thresholds[i].label || 'Unnamed threshold') + ': ' + (numberFormat ? thresholds[i].threshold.format(numberFormat) : thresholds[i].threshold.toFixed(2));

						chart.positionTooltip(thresholdHoverSVGGroups[i], {toDeviceX: tooltipX, deviceY: mainChartYScales[0](thresholds[i].threshold), withText: tooltipText, animated: animationsEnabled});
					}
				}

			}
			else {
				// There are two cases to handle if snapping is disabled:
				// 	1. Linear interpolation, which is easily handled by using the percentage of the resolved date to interpolate the data values
				//	2. All other types of interpolation which rely on the computed path length to find out the represented data values

				if (chart.interpolation == 'linear') {

					// The value sum computes the sums of the values for additive charts
					var tooltipValueSum = 0;

					// The chart tooltips
					for (var i = 0; i < mainChartYFields.length; i++) {

						var interpolatedValue;
						if (dataIndex < data.length - 1) {
							// The interpolated value is obtained by combining the two points closest to the resolved date using the date percentage computed earlier
							interpolatedValue = data[dataIndex][mainChartYFields[i]] * (1 - percent) + data[dataIndex + 1][mainChartYFields[i]] * percent;
						}
						else {
							// If there is no next data point, interpolation can't be performed
							interpolatedValue = data[dataIndex][mainChartYFields[i]];
						}

						if (mainChartIsAdditive) tooltipValueSum += interpolatedValue || 0;

						// The y position is the transformed interpolated value
						// For non-linear scales to work correctly, the Y field should be the interpolated
						// Value of the device Y value for each interpolation bounds
						var tooltipY = mainChartYScales[i](mainChartIsAdditive ? (isNaN(interpolatedValue) ? NaN : tooltipValueSum) : interpolatedValue);

						var tooltipText = (mainChartLabels[i] || mainChartYFields[i]) + ': ' + (numberFormat ? interpolatedValue.format(numberFormat) : interpolatedValue.toFixed(2));

						chart.positionTooltip(mainChartHoverSVGGroups[i], {toDeviceX: deviceX, deviceY: tooltipY, withText: tooltipText, animated: NO});
					}

				}
				else {

					// Non-linear interpolation is much more difficult
					// To obtain the interpolated value at any point, it is necessary to move along the path from an arbitrary point until reaching the desired x value
					// Even then, the Y value can only be obtain within a certain confidence interval and rarely matches the target value 100%

					// The value sum computes the sums of the values for additive charts
					// For non-linear interpolation, this value is instead used to obtain the correct non-scaled value
					// Whereas for linear interpolation, the non-scaled value is obtained first and the sum is used to position the tooltip
					var tooltipValueSum = 0;

					// The chart tooltips
					for (var i = 0; i < mainChartYFields.length; i++) {

						// The underlying SVG node of the line path
				    	var path = mainChartLineSVGGroups[i].select('path').node();
				    	var l = path.getTotalLength();

						// Represents the path length at which the interpolated value is found
				    	var pathIndex;

						// The path domain refers to the pixel interval in which the path draws
						// When the chart is zoomed, this often extends past the chart's viewable area
				    	var pathDomain = [mainChartXScale.invert(data[0][mainChartXField]), mainChartXScale.invert(data[data.length - 1][mainChartXField])];
				    	var targetX = deviceX;

      					var x = deviceX;

      					var pathPercent = percent;//(x - pathDomain[0]) / (pathDomain[1] - pathDomain[0]);

	  					// The point at which to start searching within the path
      					var pos = path.getPointAtLength((pathPercent * 3 / 4) * l);

						// The point at which to finish searching within the path
      					var endPos = path.getPointAtLength((pathPercent * 5 / 4) * l);

      					var beginning = x, end = l, target;

      					var tolerance = 0;
      					var steps = 0;

      					// Search along the path
      					while (true) {
      						steps++;
					        target = Math.floor((beginning + end) / 2);
					        pos = path.getPointAtLength(target);
					        if ((target === end || target === beginning) && pos.x !== x) {
					            break;
					        }
					        if (pos.x > x + tolerance)      end = target;
					        else if (pos.x < x - tolerance) beginning = target;
					        else                break; //position found
					    }


					    pathIndex = target;

						// The y position is path y-value at the found length
						var tooltipY = path.getPointAtLength(pathIndex).y;

						// The interpolated value is the inverse of the resolved y position
						var interpolatedValue = mainChartYScales[i].invert(tooltipY);

						// For additive charts, the resolved Y value is the sum of the current and all previous values
						// So the actual value is the current value minus the sum of all previous values
						var displayValue = mainChartIsAdditive ? ((interpolatedValue || 0) - tooltipValueSum) : interpolatedValue;

						tooltipValueSum += displayValue;

						var tooltipText = (mainChartLabels[i] || mainChartYFields[i]) + ': ' + (numberFormat ? displayValue.format(numberFormat) : displayValue.toFixed(2));

						chart.positionTooltip(mainChartHoverSVGGroups[i], {toDeviceX: deviceX, deviceY: tooltipY, withText: tooltipText, animated: NO});
					}

				}

				// Threshold and timestamp tooltips are always linear and as such they are not affected by the interpolation choice

				// The timestamp tooltip if needed
				if (showsTimestamp) {
					var tooltipText = 'Time: ' + eventHandlerTimeFormatter(new Date(date));
					chart.positionTooltip(mainChartTimestampSVGHoverGroup, {toDeviceX: deviceX, deviceY: chart.height, withText: tooltipText, animated: NO});
				}

				// Update the threshold tooltips if needed
				if (showsThresholds) {

					for (var i = 0; i < thresholds.length; i++) {
						var tooltipText = (thresholds[i].label || 'Unnamed threshold') + ': ' + (numberFormat ? thresholds[i].threshold.format(numberFormat) : thresholds[i].threshold.toFixed(2));

						chart.positionTooltip(thresholdHoverSVGGroups[i], {toDeviceX: deviceX, deviceY: mainChartYScales[0](thresholds[i].threshold), withText: tooltipText, animated: NO});
					}
				}

			}

		});

		// Update the bar chart or timeline tooltip if needed
		// The bar chart or timeline tooltip has different position requirements and logic than the main chart, so it has to be handled separately
		// It is also not batched together with the rest of the chart updates
		if (secondaryChartType == 'barchart') {
			var dataPoint = chart.barChartDataPointWithTimestamp(date);

			if (!dataPoint) return;

			var constrainedXValue = Math.floor(dataPoint[barChartXField] / barChartInterval) * barChartInterval + barChartInterval / 2;

			//if (chart.lastConstrainedXValue == constrainedXValue) return;

		    var barChartHumanReadableValue = "";

		    for (var i = 0; i < barChartYFields.length; i++) {
			    // The dy is i when i is 0 and 1 in all other cases
			    var dy = i && 1;
			    barChartHumanReadableValue += '<tspan x="14" dy="+' + (dy * 20) + '">';

			    barChartHumanReadableValue += (barChartLabels[i] || barChartYFields[i]) + ': ' +  (+dataPoint[barChartYFields[i]]).toFixed(2);

			    barChartHumanReadableValue += '</tspan>';
		    }

			if (animationsEnabled) {
				var transition = barChartHoverSVGGroup.transition().duration(75);
			}
			else {
				var transition = barChartHoverSVGGroup;
			}

		    barChartHoverSVGGroup.select("text").html(barChartHumanReadableValue);
		    var text = transition.select('text').attr("transform", "translate(0, 5)");

			//chart.lastConstrainedXValue = constrainedXValue;

			var targetDeviceX = mainChartXScale(constrainedXValue);

			var targetDeviceY = (chart.margin.top + chart.height + 15 + barChartPadding + barChartHeight / 2);
			transition.attr("transform", "translate(" + (targetDeviceX + chart.margin.left) + "," + targetDeviceY + ")");

			var background = transition.select("rect");

			try {
				// Firefox crashes here
			    background.attr("width", text.node().getBBox().width + 16)
			    	.attr("height", text.node().getBBox().height + 8);
		    }
		    catch (e) {

		    }

			try {
		    	var textWidth = text.node().getBBox().width;
		    }
		    catch (e) {
			    var textWidth = 100;
		    }


		    // Determine if the text should be positioned on the left or right of the point
		    if (targetDeviceX + textWidth + 16 > chart.width) {
		    	var textTranslationX = - textWidth - 32;

		    	text.attr("transform", "translate(" + textTranslationX + ", 5)");
		    	background.attr("transform", "translate(" + textTranslationX + ", 0)");
		    }
		    else {
		    	text.attr("transform", "translate(0, 5)");
		    	background.attr("transform", "translate(0, 0)");
		    }
		}
		else if (secondaryChartType == 'timeline') {
			if (!chart.timelineData) return;
			var timelineDataIndex = eventHandlerDateBisector.left(chart.timelineData, date) - 1;

			if (timelineDataIndex < chart.timelineData.length && timelineDataIndex >= 0) {
				var timelineDataPoint = chart.timelineData[timelineDataIndex];
				var label = timelineDataPoint[timelineStateField];

				label = timelineLabelMap[label] || label;
			}
			else {
				label = 'Unknown state';
			}

			chart.positionTooltip(timelineHoverSVGGroup, {toDeviceX: deviceX, deviceY: chart.height + timelinePadding + 15 + (timelineHeight / 2), withText: label, animated: NO});

		}

	};

	/**
	 * Set to YES while executing tooltip position blocks.
	 */
	var isTooltipPositionBatched = NO;

	/**
	 * Captures tooltip requests while executing tooltip position blocks.
	 * These tooltips will then be positioned together.
	 */
	var batchedTooltips = [];

	/**
	 * Positions the tooltips requested in the given block while ensuring that no tooltip requested within the block
	 * will overlapp any other tooltip.
	 * @param block <void ^ ()>		The block to execute. This block will execute synchronously before this function returns.
	 */
	this.positionTooltipsWithBlock = function(block) {
		isTooltipPositionBatched = YES;
		block();

		isTooltipPositionBatched = NO;

		// The tooltips will be sorted such that the topmost tooltips will appear first
		batchedTooltips.sort(function (a, b) {
		  return (a.options.deviceY || chart.margin.top) - (b.options.deviceY || chart.margin.top);
		});

		// The caret represents the minimum Y position that a tooltip may not exceed
		var caret = 0;

		// Apply the changes
		for (var i = 0; i < batchedTooltips.length; i++) {
			batchedTooltips[i].options.afterCaret = caret;
		
			// The beforeCaret represents the maximum Y position that a tooltip may not exceed, otherwise
			// The other tooltips will scroll down out of view
			// It can be approximated statically based on the number of tooltips and should not be greater than chart.height + 12 (half the axis size)
			// NOTE: this may not be strictly accurate for all configurations
			batchedTooltips[i].options.beforeCaret = chart.height - 29 * (batchedTooltips.length - i) + 12;
			caret = chart.positionTooltip(batchedTooltips[i].tooltip, batchedTooltips[i].options);
		}

		// Reset the batched tooltips
		batchedTooltips = [];
	};

	/**
	 * Positions the given tooltip element with the given device coordinates and sets its label texts.
	 * @param tooltip <d3.select>				The D3 selection containing the tooltip SVG group.
	 * {
	 *	@param toDeviceX <Number>				The x position, in device pixels. This position should be relative to the chart origin.
	 *	@param deviceY <Number>					The y position, in device pixels. This position should be relative to the chart origin.
	 *	@param withText <String>				The text to use for the tooltip.
	 *	@param afterCaret <Number, nullable>	If set, the tooltip will not be positioned above the requested caret.
	 *	@param beforeCaret <Number, nullable>	If set, the tooltip will be positioned above this caret, unless doing so would position it below the afterCaret.
	 *  @param animated <Boolean, nullable>		Defaults to NO. If set to YES, the change will be animated.
	 * }
	 * @return <Number>							The bottom position of the tooltip background.
	 */
	this.positionTooltip = function (tooltip, options) {
		// If this function was called from within a tooltip block, the params are saved so they applied after the block finishes executing.
		if (isTooltipPositionBatched) {
			batchedTooltips.push({
				tooltip: tooltip,
				options: options
			});

			return;
		}

		// Handle the cases where the value is missing
		var valueIsMissing = NO;
		if (isNaN(options.deviceY)) {
			// This will cause the hover effect to go missing due to clipping
			valueIsMissing = YES;
			options.deviceY = options.afterCaret || chart.margin.top;
		}

		if (options.animated) tooltip = tooltip.transition().duration(75);
		// Move the tooltip group to the requested point
		tooltip.attr("transform", "translate(" + (options.toDeviceX + chart.margin.left) + "," + (valueIsMissing ? -100 : options.deviceY + chart.margin.top) + ")");

	    var text = tooltip.select("text").text(options.withText);

	    var backgroundYPosition = options.deviceY - 14;
	    var backgroundYTranslation = 0;
	    if (backgroundYPosition > options.beforeCaret) {
		    backgroundYTranslation = options.beforeCaret - backgroundYPosition;
	    }
	    if ((backgroundYPosition + backgroundYTranslation) < options.afterCaret) {
		    backgroundYTranslation = options.afterCaret - backgroundYPosition;
	    }

		// The text is measured so it can be determined its gravity and the tooltip background's size
		try {
			// Firefox crashes here - use defaults
			var textWidth = text.node().getBBox().width;
			var textHeight = text.node().getBBox().height;
		}
		catch (e) {
			var textWidth = 100;
			var textHeight = 100;
		}

	    var background = tooltip.select("rect")
	    	.attr("width", textWidth + 16)
	    	.attr("height", textHeight + 8);

	    if (!options.animated && animationsEnabled) {
		    text = text.transition().duration(75);
		    background = background.transition().duration(75);
	    }

	    // Determine if the text should be positioned on the left or right of the point
	    if (options.toDeviceX + textWidth + 16 > chart.width) {
	    	var textTranslationX = - textWidth - 32;

	    	text.attr("transform", "translate(" + textTranslationX + ", " + (valueIsMissing ? -100 : backgroundYTranslation) + ")");
	    	background.attr("transform", "translate(" + textTranslationX + ", " + (valueIsMissing ? -100 : backgroundYTranslation) + ")");
	    }
	    else {
	    	text.attr("transform", "translate(0, " + (valueIsMissing ? -100 : backgroundYTranslation) + ")");
	    	background.attr("transform", "translate(0, " + (valueIsMissing ? -100 : backgroundYTranslation) + ")");
	    }

	    return backgroundYPosition + textHeight + 8 + backgroundYTranslation;

	};


	/**
	 * Hides or shows all the tooltip elements.
	 * @param hidden <Boolean, nullable>		Defaults to YES. If set to YES, the elements will be hidden, otherwise they will be made visible.
	 */
	this.tooltipElementsSetHidden = function (hidden) {
		if (hidden === undefined) hidden = YES;

		var display = hidden ? 'none' : null;

		// Show the main chart hover components
		for (var i = 0; i < mainChartYFields.length && !secondaryChartOnly; i++) {
			mainChartHoverSVGGroups[i].style('display', display);
		}

		// Show the timestamp hover component if needed
		if (showsTimestamp) mainChartTimestampSVGHoverGroup.style('display', display);

		// Show the threshold hover components if needed
		if (showsThresholds && !secondaryChartOnly) {
			for (var i = 0; i < thresholds.length; i++) {
				thresholdHoverSVGGroups[i].style('display', display);
			}
		}

		// Show the bar chart hover component if needed
		if (secondaryChartType == 'barchart') {
			barChartHoverSVGGroup.style('display', display);
		}
		else if (secondaryChartType == 'timeline') {
			timelineHoverSVGGroup.style('display', display);
		}

	}

	/************************** LEGACY CODE ***********************/

	var rightMargin = 10;

	var initialized = false;
	var flipInterpolation = false;

	/**
	 * The SVG group containing the timeline hover components.
	 */
	var timelineHoverSVGGroup;

	/**
	 * Updates the timeline. This change will not be animated.
	 * @param timelineData <[AnyObject]>		The new timeline data.
	 * @param resized <Boolean, nullable>		Defaults to NO. Should be set to YES if this change was caused by a resize or NO otherwise.
	 */
	this.updateTimeline = function(timelineData, resized) {
		if (resized === undefined) resized = false;

		// The chart must have data for the timeline to render
		// Otherwise the x scale will have an invalid domain
		if (!chart.data) return;

		var thisWidget = this;

		this.timeline = d3.timeline();
		this.timeline.showTimeAxis()
            .colors(this.colorScale)
            .colorProperty('color');

		this.timeline.beginning(mainChartXScale.domain()[0]);
		this.timeline.ending(mainChartXScale.domain()[1]);
		this.timeline.scroll(function() {});

		this.timeline.hover(function(d, i, datum) {

			var transition = timelineHoverSVGGroup;
			timelineHoverSVGGroup.style("display", null);

			if (datum.color !== undefined) {
				transition.select("circle")
					.style("stroke", datum.color);
			}

		    var text = transition.select("text").text(datum.displayLabel);

		    transition.select("rect")
		    	.attr("width", text.node().getBBox().width + 16)
		    	.attr("height", text.node().getBBox().height + 8);
		})
		.mouseout(function(d, i, datum) {

			timelineHoverSVGGroup.style("display", "none");

		});

		this.svg.select("#timeline-" + chart.jqElementId).remove();
		this.jqElement.find("#timeline-" + chart.jqElementId).remove();
		this.svg.append("svg")
			.datum(this.timelineData)
			.attr("id", "timeline-" + chart.jqElementId)
			.attr("width", chart.width)
			.attr("y", chart.height + 22 + chart.margin.top)
			.attr("x", chart.margin.left)
			.call(chart.timeline);

		chart.svg.select("#timeline-" + chart.jqElementId).on("mousemove", function(event) {
			try {
				var transition = timelineHoverSVGGroup;
				timelineHoverSVGGroup.style("display", null);

				transition.attr("transform", "translate(" + (d3.mouse(this)[0] + chart.margin.left) + ", " + (chart.height + 56 + chart.margin.top) + ")");
			}
			catch(e) {
				console.log(e.stack);
			}
		});

		// Bring the hover components back to the front
		var timelineHoverSVGGroupNpde = timelineHoverSVGGroup.node();
		timelineHoverSVGGroupNpde.parentNode.appendChild(timelineHoverSVGGroupNpde);



	};

	/**
	 * Invoked by the Thingworx runtime whenever any of this widget's services were triggered.
	 * @param service <String>					The triggered service.
	 */
	this.serviceInvoked = function (service) {
		if (service == 'Export') {

			/*this.jqElement.find('.overlay').css({'fill': 'transparent'});
			this.jqElement.find('.area').css({'fill': 'transparent'});
			this.jqElement.find('.axis line, .axis path').css({'fill': 'transparent', stroke: '#999', 'stroke-width': 1});*/

			var combinedStyleBlock = baseStyleBlock;

			for (var i = 0; i < styleBlocks.length; i++) {
				combinedStyleBlock += '\n' + styleBlocks[i].replace('<style>', '').replace('</style>', '');
			}

			combinedStyleBlock = '<style class="D3ExportStyleTag"><![CDATA[' + combinedStyleBlock + ']]></style>';

			chart.jqElement.find('defs').append(combinedStyleBlock);

			chart.svg.attr('version', 1.1).attr('xmlns', 'http://www.w3.org/2000/svg').attr('id', this.jqElementId);

			var html = chart.svg.node().outerHTML;

			var imgsrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(html)));

			var canvas = $('<canvas>');

			canvas.css({
				width: this.jqElement.width(),
				height: this.jqElement.height()
			});

			this.jqElement.append(canvas);

			canvas[0].width = this.jqElement.outerWidth();
			canvas[0].height = this.jqElement.outerHeight();

			setTimeout(function () {
				var context = canvas[0].getContext('2d');

				var image = new Image();

				image.onload = function () {
					context.drawImage(image, 0, 0);

					var canvasdata = canvas[0].toDataURL('image/png');

					var a = document.createElement('a');
					a.download = chart.getProperty('ExportFilename');
					a.href = canvasdata;
					a.click();

					canvas.remove();

					chart.jqElement.find('.D3ExportStyleTag').remove();
					chart.svg.attr('id', '');
				}

				image.src = imgsrc;

			}, 0);
		}
	}

};
