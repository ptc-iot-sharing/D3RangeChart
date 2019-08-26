TW.IDE.Widgets.D3RangeGraph = function () {

    this.widgetProperties = function () {
        return {
            'name': 'D3 Range Graph',
            'description': 'D3 Range Graph',
            'category': ['Common'],
	        'supportsAutoResize': true,
            'properties': {
                Width: {
                    defaultValue: 500
                },
                Height: {
                    defaultValue: 300
                },
                ShowLegend: {
                    defaultValue: true,
                    baseType: 'BOOLEAN',
                    description: 'If enabled, the widget will show a legend above the graph.'
                },
                AlignLegendToLeft: {
                    defaultValue: false,
                    baseType: 'BOOLEAN',
                    description: 'If enabled, the legend will be aligned to the left.'
                },
				Data: {
					baseType: 'INFOTABLE',
					description: 'The dataset for this chart.',
					isBindingTarget: true
				},
				DataAutoSort: {
					baseType: 'BOOLEAN',
					description: 'If enabled, the chart will sort the data',
					defaultValue: false
				},
                Fill: {
                    defaultValue: false,
                    baseType: 'BOOLEAN',
                    description: 'If enabled, the widget will fill in the content below each line, using a transparent color.'
                },
                FillOpacity: {
                    defaultValue: 0.1,
                    baseType: 'NUMBER',
                    description: 'If fills are enabled, this sets how transparent the fill color should be.'
                },
                DisplayConfiguration: {
	                defaultValue: '',
	                baseType: 'STRING',
	                description: 'If set, controls how to display each field. Setting this value will cause the Fill, FillOpacity, ShowDataPoints and DataPointSize properties to be ignored.',
	                isBindingTarget: true
                },
				ShowDataPoints: {
					baseType: 'BOOLEAN',
					description: 'If enabled, the actual data points will be visible as circles on the graph.',
					defaultValue: false
				},
                DataPointSize: {
                    baseType: 'NUMBER',
                    defaultValue: 100,
                    description: 'Must be used with ShowsDataPoints. Controls how large the data points should be.'
                },
                XField: {
                    baseType: 'FIELDNAME',
                    description: 'The x axis field.',
                    isVisible: true,
                    isEditable: true,
                    sourcePropertyName: 'Data'
                },
                YFields: {
                    baseType: 'STRING',
                    description: 'A stringified JSON array of the y fields to be displayed on the graph.',
                    isBindingTarget: true
                },
                YFieldColors: {
                    baseType: 'STRING',
                    description: 'A stringified JSON array of the y field colors to be displayed on the graph.',
                    isBindingTarget: true
                },
                StrokeWidths: {
                    baseType: 'STRING',
                    description: 'Optional. A stringified JSON array of the stroke widths to be displayed on the graph. If left blank, the default width of 2 will be used.',
                    isBindingTarget: true
                },
                Labels: {
                    baseType: 'STRING',
                    description: 'Optional. A serialized JSON array string of the human readable strings to use on the legend and flyouts. If left blank, the actual field names will be used instead.',
                    isBindingTarget: true
                },
                Patterns: {
                    baseType: 'STRING',
                    description: 'A serialized JSON array string of the dash pattern to use on each line. The dash pattern string should be a standard SVG dash pattern. If left blank, no dash pattern will be used.',
                    isBindingTarget: true,
                    isVisible: true
                },
                Additive: {
	              	description: 'Requires and enables shared Y axis if used. If enabled, the Y values will be added to each other.',
	              	baseType: 'BOOLEAN',
	              	defaultValue: false
                },
                Thresholds: {
                    baseType: 'STRING',
                    description: 'A serialized JSON array string of the threshold lines to draw. Using this property requires and will automatically enable shared Y axis.',
                    isBindingTarget: true
                },
                ShowThresholdsOnHover: {
                    baseType: 'BOOLEAN',
                    description: 'If enabled, the threshold values will be displayed when hovering over the chart.',
                    defaultValue: false
                },
				MinYValue: {
					baseType: 'NUMBER',
					defaultValue: -1
				},
				MaxYValue: {
					baseType: 'NUMBER',
					defaultValue: -1
				},
				SharedYAxis: {
					baseType: 'BOOLEAN',
					defaultValue: false
				},
				ShowsYAxis: {
					baseType: 'BOOLEAN',
					defaultValue: true,
					description: 'If disabled, the Y axis will not be visible on the main chart.'
				},
                XTicks: {
                    baseType: 'INTEGER',
                    defaultValue: 10,
                    description: 'The number of ticks to show on the x axis.'
                },
                TimeFormat: {
                    baseType: 'STRING',
                    defaultValue: '',
                    description: 'The time format to use. If left blank, the chart will use D3\'s default time format.'
                },
                TimeFormatLocale: {
	                baseType: 'STRING',
	                defaultValue: '',
	                description: 'The serialized locale definition to use for the time axis. If omitted, the default english locale will be used.',
	                isBindingTarget: true
                },
                YFormat: {
                    baseType: 'STRING',
                    defaultValue: '',
                    description: 'The number format to use. If left blank, the chart will use the default format with no decimal places.'
                },
                YAxisFormat: {
                    baseType: 'STRING',
                    defaultValue: '',
                    description: 'Optional. If specified, this is the number format to use for the Y axis labels; otherwise, the YFormat will be used instead.'
                },
                ShowTimeOnHover: {
                    baseType: 'BOOLEAN',
                    defaultValue: false,
                    description: 'If enabled, when hovering the chart, the timestamp will be displayed as well.'
                },
				YTicks: {
					baseType: 'INTEGER',
					defaultValue: 5,
					description: 'The number of ticks to show on the y axis.'
				},
                ScaleType: {
                    baseType: 'STRING',
                    description: 'Controls the type of scale used for the y axis.',
                    defaultValue: 'linear',
                    selectOptions: [
                        { value: 'linear', text: 'Linear Scale' },
                        { value: 'log', text: 'Logarithmic Scale' },
                        { value: 'pow', text: 'Power Scale' },
                        { value: 'sqrt', text: 'Square Root Scale' }
                    ]
                },
                ScaleFactor: {
	                baseType: 'STRING',
	                description: 'Only used with logarithmic or power scales. For logarithmic scales, this is the base of the logarithm and for power scales this is the exponent. This value must be either a number, "e" or "pi".',
	                defaultValue: 'e'
                },
                NonLinearScaleInterpolationInterval: {
	              	baseType: 'NUMBER',
	              	description: 'Must be used with a non-linear scale and linear interpolation. If set to a strictly positive number, the chart will add an additional point every value milliseconds to cause the chart to follow the non-linear scale more closely. This property will have a negative impact on performance with small values and many data points.',
	              	defaultValue: 0
                },
                SelectorHeight: {
                    baseType: 'INTEGER',
                    defaultValue: 70,
                    description: 'The height of the range selector.'
                },
				RightMargin: {
					baseType: 'INTEGER',
					defaultValue: 40,
					description: 'The margin reserved for the y axis text.'
				},
				TopMargin: {
					baseType: 'INTEGER',
					defaultValue: 0,
					description: 'The margin reserved for the legend.'
				},
				SecondaryChartType: {
					baseType: 'STRING',
					defaultValue: 'none',
					description: 'The type of seconday chart to use. The secondary chart will appear below the main chart and above the selector and is controlled by the same selector as the main chart.',
                    selectOptions: [
                        { text: 'None', value: 'none' },
                        { text: 'Timeline', value: 'timeline' },
                        { text: 'Bar Chart', value: 'barchart' }
                    ]
				},
				SecondaryChartOnly: {
					baseType: 'BOOLEAN',
					defaultValue: false,
					description: 'Must be used with a secondary chart type other than none. If enabled, the main chart will not be visible.'
				},
				/********** TIMELINE PROPERTIES **********/
                TimelineData: {
                    baseType: 'INFOTABLE',
                    description: 'The dataset for the event timeline.',
                    isBindingTarget: true,
                    isVisible: true
                },
                TimelineXField: {
                    baseType: 'FIELDNAME',
                    description: 'The x field for the event timeline.',
                    sourcePropertyName: 'TimelineData',
                    isVisible: true
                },
                TimelineStateField: {
                    baseType: 'FIELDNAME',
                    description: 'The state field for the event timeline.',
                    sourcePropertyName: 'TimelineData',
                    isVisible: true
                },
                TimelineHeight: {
	                baseType: 'NUMBER',
	                description: 'How tall the timeline should be.',
	                defaultValue: 72
                },
                TimelinePadding: {
	            	baseType: 'INTEGER',
	            	defaultValue: 11,
	            	description: 'Controls the spacing between the chart, selector and secondary timeline.',
	            	isVisible: true
                },
                TimelineShowsXAxis: {
					baseType: 'BOOLEAN',
					description: 'If enabled, the X axis will be duplicated at the bottom of the timeline.',
					defaultValue: false,
					isVisible: true
                },
                TimelineColorMap: {
	                baseType: 'STRING',
	                description: 'A serialized JSON object that matches states to the colors they should be drawn with.',
					defaultValue: '{}'
                },
                /********** BARCHART PROPERTIES ***********/
                BarChartData: {
	                baseType: 'INFOTABLE',
	                description: 'The dataset for the bar chart.',
	                isBindingTarget: true,
	                isVisible: true
                },
                BarChartIntervalSize: {
	                baseType: 'NUMBER',
	                description: 'Required for bar charts; specifies the time interval, in milliseconds that each bar should occupy.',
	                defaultValue: 3600000,
	                isVisible: true
                },
                BarChartMinYValue: {
	                baseType: 'NUMBER',
	                description: 'The minimum value to use for the bar chart. If set to -1, the chart will use the minimum value within the data set.',
	                defaultValue: -1,
	                isVisible: true
                },
                BarChartMaxYValue: {
	                baseType: 'NUMBER',
	                description: 'The maximum value to use for the bar chart. If set to -1, the chart will use the maximum value within the data set.',
	                defaultValue: -1,
	                isVisible: true
                },
                BarChartHeight: {
	                baseType: 'NUMBER',
	                description: 'How tall the bar chart should be.',
	                defaultValue: 150
                },
                BarChartXField:  {
	                baseType: 'FIELDNAME',
	                description: 'The x field for the bar chart.',
	                sourcePropertyName: 'BarChartData',
	                isVisible: true
                },
                BarChartYFields: {
	                baseType: 'STRING',
	                description: 'A serialized JSON array containing the y fields for the bar chart. The bar chart Y axis is always shared with all Y fields.',
	                defaultValue: '[]',
	                isVisible: true,
	                isBindingTarget: true
                },
                BarChartColors: {
	              	baseType: 'STRING',
	              	description: 'A serialized JSON array containing the bar colors for the bar chart.',
	              	defaultValue: '[]',
	              	isVisible: true,
	              	isBindingTarget: true
                },
                BarChartShowsLegend: {
	              	baseType: 'BOOLEAN',
	              	description: 'Must be used with ShowLegend. If enabled, the bar chart labels will also be shown on the legend.',
	              	isVisible: true,
	              	defaultValue: true
                },
                BarChartLabels: {
	              	baseType: 'STRING',
	              	description: 'A serialized JSON array containing the bar labels for the bar chart.',
	              	defaultValue: '[]',
	              	isVisible: true,
	              	isBindingTarget: true
                },
				BarChartNumberOfYTicks: {
					baseType: 'INTEGER',
					description: 'The number of Y ticks to show on the bar chart axis. This number is primarily a suggestion; the actual number of ticks may differ',
					defaultValue: 3,
					isVisible: true
				},
				BarChartShowsXAxis: {
					baseType: 'BOOLEAN',
					description: 'If enabled, the X axis will be duplicated at the bottom of the bar chart.',
					defaultValue: false,
					isVisible: true
				},
                BarChartMultipleValuesDisplay: {
					baseType: 'STRING',
					defaultValue: 'together',
					description: 'Controls how multiple bars should appear. Together makes them appear one next to another, while stacked makes them appear one over another.',
                    selectOptions: [
                        { value: 'together', text: 'Together' },
                        { value: 'stacked', text: 'Stacked' }
                    ],
                    isVisible: true
                },
                BarChartPadding: {
	            	baseType: 'INTEGER',
	            	defaultValue: 22,
	            	description: 'Controls the spacing between the chart, selector and secondary bar chart.',
	            	isVisible: true
                },
                Interpolation: {
                    baseType: 'STRING',
                    description: 'The interpolation method to use.',
                    defaultValue: 'linear',
                    selectOptions: [
                        { value: 'linear', text: 'Linear' },
                        //{ value: 'linear-closed', text: 'linear-closed' },
                        { value: 'step-before', text: 'step-before' },
                        { value: 'step-after', text: 'step-after' },
                        { value: 'basis', text: 'basis' },
                        { value: 'basis-open', text: 'basis-open' },
                        //{ value: 'basis-closed', text: 'basis-closed' },
                        { value: 'bundle', text: 'bundle' },
                        { value: 'cardinal', text: 'cardinal' },
                        { value: 'cardinal-open', text: 'cardinal-open' },
                        //{ value: 'cardinal-closed', text: 'cardinal-closed' },
                        { value: 'monotone', text: 'monotone' }
                    ],
                    'isBindingTarget': true
                },
                MissingValues: {
                    baseType: 'STRING',
                    description: 'Controls how missing values are handled.',
                    defaultValue: 'break',
                    selectOptions: [
                        { value: 'break', text: 'Interrupt graph' },
                        { value: 'closest', text: 'Use closest value' },
                        { value: 'interpolate', text: 'Interpolate' }
                    ]
                },
				Minimal: {
					baseType: 'BOOLEAN',
					defaultValue: false,
					description: 'If enabled, the axes, selector and secondary charts will be hidden.'
				},
				/*ReflowsOnDataChange: {
					baseType: 'BOOLEAN',
					defaultValue: false,
					description: 'If enabled, chart will automatically select the entire range when data is updated.'
				},*/
                RangeUpdateType: {
                    baseType: 'STRING',
                    description: 'Controls the selected range changes when new data arrives.',
                    defaultValue: 'break',
                    selectOptions: [
                        { value: 'retain', text: 'Don\'t change range' },
                        { value: 'extend', text: 'Extend when stuck to edge' },
                        { value: 'move', text: 'Move when stuck to edge' },
                        { value: 'release', text: 'Select entire range' }
                    ]
                },
                RangeStart: {
                    baseType: 'DATETIME',
                    isBindingSource: true,
                    isBindingTarget: true,
                    description: 'The currently selected range start time. If bound, the chart will select the given range start.'
                },
                RangeEnd: {
                    baseType: 'DATETIME',
                    isBindingSource: true,
                    isBindingTarget: true,
                    description: 'The currently selected range end time. If bound, the chart will select the given range end.'
                },
                DragToZoom: {
                    baseType: 'BOOLEAN',
                    defaultValue: false,
                    description: 'If enabled, the selector will be disabled and you can instead drag over the chart to zoom in or right click to zoom out.'
                },
                EnableTrackGesturesPadAndWheel: {
                    baseType: 'BOOLEAN',
                    defaultValue: true,
                    description: 'If enabled, the user can zoom and pan the chart using the mouse wheel and two finger events on macs with trackpads.'
                },
                EnableTouchGestures: {
                    baseType: 'BOOLEAN',
                    defaultValue: true,
                    description: 'If enabled, the user can zoom and pan the chart through pinch-zoom and two-finger scroll gestures on touch device.'
                },
                ShowsSelector: {
                    baseType: 'BOOLEAN',
                    description: 'If disabled, the range selector will be hidden.',
                    defaultValue: true
                },
                SnapsToPoints: {
                    baseType: 'BOOLEAN',
                    defaultValue: false,
                    description: 'If enabled, when moving the mouse pointer over the graph, the arrow will snap to the closest data point.'
                },
                AnimationsEnabled: {
                    baseType: 'BOOLEAN',
                    defaultValue: true,
                    description: 'Enables or disables all animations.'
                },
                AnimationDuration: {
	                baseType: 'NUMBER',
	                defaultValue: 300,
	                description: 'Controls how long update animations should last. This will also affect how long the chart will wait to batch property updates together.',
	                isBindingTarget: true
                },
                XAxisStyle: {
                    baseType: 'STYLEDEFINITION',
                    description: 'The style to use for the x axis on both the main chart and the selector.'
                },
                YAxisStyle: {
                    baseType: 'STYLEDEFINITION',
                    description: 'The style to use for the y axis on the main chart. If shared Y axis is not enabled, the text color attribute will be ignored.'
                },
                BackgroundStyle: {
                    baseType: 'STYLEDEFINITION',
                    description: 'If set, the chart will use this style\'s background color.'
                },
                ExportFilename: {
                    baseType: 'STRING',
                    description: 'The file name used when exporting this chart as an image.',
                    defaultValue: 'export.png'
                }
			}
        };
    };

    this.widgetEvents = function () {
        return {
//             DoubleClicked: {description: 'Dispatched when a data point is double clicked.'}
        }
    };

    this.widgetServices = function () {
        return {
            Export: {description: 'Downloads a PNG version of this chart as it appears when this service is invoked.'}
        }
    }

	this.afterSetProperty = function (name, value) {
        var refreshHTML = false;
		switch (name) {
			case 'Width':
			case 'Height':
				refreshHTML = true;
                break;
            default:
                break;
        }
        return refreshHTML;
    };

    this.renderHtml = function () {
        var html = '<div class="widget-content" style="background: #888;"></div>';
        return html;
    };

};
