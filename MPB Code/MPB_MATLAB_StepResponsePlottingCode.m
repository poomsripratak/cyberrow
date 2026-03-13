%% -------- USER SETTINGS --------
filename  = "Test1.csv"; % Create a csv file (use Excel) and upload the Arduino serial monitor into it
step_type = "rising";   % "rising" or "falling" step responses 

%% -------- READ CSV FILE --------
T = readtable(filename);

t_ms = T{:,1};
I_A  = T{:,2};

t_ms = t_ms(:);
I_A  = I_A(:);

%% -------- SAMPLING INFO --------
dt = mean(diff(t_ms));      % ms/sample
fs = 1000/dt;               % Hz

%% -------- BUTTERWORTH FILTER --------
fc = 5;
order = 2;

[b,a] = butter(order, fc/(fs/2));
I_filt = filtfilt(b,a,I_A);

%% -------- FIND STEP START --------
dI = [0; diff(I_filt)];

idx_search0 = find(t_ms >= 0, 1, 'first');
if isempty(idx_search0)
    idx_search0 = 1;
end

thr = 0.01;   % derivative threshold (A/sample)

switch lower(step_type)
    case "rising"
        k = find(dI(idx_search0:end) > thr, 1, 'first');
        if isempty(k)
            error("No rising step detected. Reduce thr or check data.");
        end

    case "falling"
        k = find(dI(idx_search0:end) < -thr, 1, 'first');
        if isempty(k)
            error("No falling step detected. Reduce thr or check data.");
        end

    otherwise
        error('step_type must be "rising" or "falling".');
end

idx_start = k + idx_search0 - 1;

%% -------- INITIAL / FINAL LEVELS --------
pre_ms  = 100;
pre_N   = max(5, round((pre_ms/1000)*fs));

tail_ms = 300;
tail_N  = max(10, round((tail_ms/1000)*fs));

idx_pre0 = max(1, idx_start - pre_N);
idx_pre1 = max(1, idx_start - 1);

I_init  = mean(I_filt(idx_pre0:idx_pre1));
I_final = mean(I_filt(max(1,end-tail_N+1):end));

%% -------- STEP METRICS --------
switch lower(step_type)
    case "rising"
        dI_step = I_final - I_init;

        if dI_step <= 0
            error("Signal does not appear to be a rising step based on I_init/I_final.");
        end

        I_10 = I_init + 0.1*dI_step;
        I_90 = I_init + 0.9*dI_step;

        idx_10 = find(I_filt >= I_10 & (1:numel(I_filt))' >= idx_start, 1, 'first');
        if isempty(idx_10)
            error("Couldn't find 10%% crossing.");
        end

        idx_90 = find(I_filt >= I_90 & (1:numel(I_filt))' >= idx_10, 1, 'first');
        if isempty(idx_90)
            error("Couldn't find 90%% crossing.");
        end

        t1 = t_ms(idx_10);
        t2 = t_ms(idx_90);
        response_time = t2 - t1;

        point1_label = "10% point";
        point2_label = "90% point";
        response_label = "10–90% Rise Time";

        point1_y = I_filt(idx_10);
        point2_y = I_filt(idx_90);

        point1_idx = idx_10;
        point2_idx = idx_90;

        plot_title = "Step Response 0.5A, Gain 3, Kick Time 1000ms"

    case "falling"
        dI_step = I_init - I_final;

        if dI_step <= 0
            error("Signal does not appear to be a falling step based on I_init/I_final.");
        end

        I_90 = I_final + 0.9*dI_step;
        I_10 = I_final + 0.1*dI_step;

        idx_90 = find(I_filt <= I_90 & (1:numel(I_filt))' >= idx_start, 1, 'first');
        if isempty(idx_90)
            error("Couldn't find 90%% crossing.");
        end

        idx_10 = find(I_filt <= I_10 & (1:numel(I_filt))' >= idx_90, 1, 'first');
        if isempty(idx_10)
            error("Couldn't find 10%% crossing.");
        end

        t1 = t_ms(idx_90);
        t2 = t_ms(idx_10);
        response_time = t2 - t1;

        point1_label = "90% point";
        point2_label = "10% point";
        response_label = "90–10% Fall Time";

        point1_y = I_filt(idx_90);
        point2_y = I_filt(idx_10);

        point1_idx = idx_90;
        point2_idx = idx_10;

        plot_title = "Electrical MPB Reverse Step Response";
end

%% -------- PLOT --------
figure('Color','w');

plot(t_ms, I_A, 'LineWidth', 1.0); 
hold on;
plot(t_ms, I_filt, 'LineWidth', 2);

plot(t_ms(point1_idx), point1_y, 'ko', 'MarkerFaceColor', 'g');
plot(t_ms(point2_idx), point2_y, 'ko', 'MarkerFaceColor', 'r');

grid on;
box on;

xlabel("Time (ms)", 'FontSize', 20);
ylabel("Measured Current (A)", 'FontSize', 20);
title(plot_title, 'FontSize', 20);

xlim([min(t_ms) 2000]);

lgd = legend("Raw", "Filtered", point1_label, point2_label, "Location", "best");
lgd.FontSize = 20;

ax = gca;
ax.FontSize = 20;

%% -------- PRINT RESULTS --------
fprintf("Step type: %s\n", step_type);
fprintf("Sampling frequency: %.1f Hz\n", fs);
fprintf("I_init:  %.3f A\n", I_init);
fprintf("I_final: %.3f A\n", I_final);
fprintf("Step amplitude: %.3f A\n", dI_step);
fprintf("10%% level: %.3f A\n", I_10);
fprintf("90%% level: %.3f A\n", I_90);
fprintf("%s: %.1f ms\n", response_label, response_time);